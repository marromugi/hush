use std::fmt;

use serde::Serialize;

use crate::core_error::CoreError;
use crate::crypto::VaultKey;

/// How this device recognizes its owner.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Biometry {
    TouchId,
    FaceId,
    OpticId,
}

/// Where this device keeps each vault's key behind Touch ID or Face ID, by
/// vault id. A kept key opens the vault without the passphrase.
///
/// Whether it is turned on is kept apart from the key. iOS stops giving the
/// key out when the fingers or face set up change, and the setting must not
/// turn itself off when that happens.
pub trait VaultKeyStore: fmt::Debug + Send + Sync {
    /// The kind the device has, even while it cannot be used for now.
    /// `None` when the device has none.
    fn biometry(&self) -> Option<Biometry>;
    /// Whether the person has turned it on for the vault. Asks for nothing.
    fn is_on(&self, vault_id: &str) -> Result<bool, CoreError>;
    /// Keeps `key`, replacing any kept before, so that only the fingers or
    /// face set up right now can take it out again; then turns it on.
    fn set(&self, vault_id: &str, key: &VaultKey) -> Result<(), CoreError>;
    /// Asks for Touch ID or Face ID, showing `reason` where the system has
    /// room for it. `None` when nothing comes out: no key was kept, or iOS
    /// no longer gives it out.
    fn get(&self, vault_id: &str, reason: &str) -> Result<Option<VaultKey>, CoreError>;
    /// Forgets the key and turns it off.
    fn remove(&self, vault_id: &str) -> Result<(), CoreError>;
}

/// A device without Touch ID or Face ID: nothing is ever kept.
#[derive(Debug)]
pub struct NoBiometry;

impl VaultKeyStore for NoBiometry {
    fn biometry(&self) -> Option<Biometry> {
        None
    }

    fn is_on(&self, _: &str) -> Result<bool, CoreError> {
        Ok(false)
    }

    fn set(&self, _: &str, _: &VaultKey) -> Result<(), CoreError> {
        Err(CoreError::NoBiometry)
    }

    fn get(&self, _: &str, _: &str) -> Result<Option<VaultKey>, CoreError> {
        Ok(None)
    }

    fn remove(&self, _: &str) -> Result<(), CoreError> {
        Ok(())
    }
}

/// Keys held in memory, behind a Touch ID that always matches unless told to
/// refuse, for tests.
#[cfg(test)]
#[derive(Debug, Default)]
pub struct MemoryVaultKeys {
    keys: std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>>,
    on: std::sync::Mutex<std::collections::HashSet<String>>,
    /// Set to act as if the person cancelled the prompt.
    pub refuse: std::sync::atomic::AtomicBool,
}

#[cfg(test)]
impl MemoryVaultKeys {
    /// Puts raw bytes in place of the key, as a key from another vault would be.
    pub fn plant(&self, vault_id: &str, bytes: &[u8]) {
        let mut keys = self.keys.lock().unwrap();
        keys.insert(vault_id.to_string(), bytes.to_vec());
    }

    /// Stops giving the key out while it stays on, as iOS does once the
    /// fingers or face set up change.
    pub fn invalidate(&self, vault_id: &str) {
        self.keys.lock().unwrap().remove(vault_id);
    }
}

#[cfg(test)]
impl VaultKeyStore for MemoryVaultKeys {
    fn biometry(&self) -> Option<Biometry> {
        Some(Biometry::TouchId)
    }

    fn is_on(&self, vault_id: &str) -> Result<bool, CoreError> {
        Ok(self.on.lock().unwrap().contains(vault_id))
    }

    fn set(&self, vault_id: &str, key: &VaultKey) -> Result<(), CoreError> {
        self.plant(vault_id, key.as_bytes());
        self.on.lock().unwrap().insert(vault_id.to_string());
        Ok(())
    }

    fn get(&self, vault_id: &str, _: &str) -> Result<Option<VaultKey>, CoreError> {
        if self.refuse.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(CoreError::BiometryCancelled);
        }
        let keys = self.keys.lock().unwrap();
        Ok(keys
            .get(vault_id)
            .and_then(|bytes| VaultKey::from_bytes(bytes)))
    }

    fn remove(&self, vault_id: &str) -> Result<(), CoreError> {
        self.keys.lock().unwrap().remove(vault_id);
        self.on.lock().unwrap().remove(vault_id);
        Ok(())
    }
}

#[cfg(target_os = "ios")]
pub use ios::BiometricKeychain;

#[cfg(target_os = "ios")]
mod ios {
    use core_foundation::base::{CFType, CFTypeRef, TCFType};
    use core_foundation::boolean::CFBoolean;
    use core_foundation::data::CFData;
    use core_foundation::dictionary::CFDictionary;
    use core_foundation::string::CFString;
    use objc2_foundation::NSString;
    use objc2_local_authentication::{LABiometryType, LAContext, LAPolicy};
    use security_framework::access_control::{ProtectionMode, SecAccessControl};
    use security_framework::passwords::AccessControlOptions;
    use security_framework_sys::item::{
        kSecAttrAccessControl, kSecAttrAccount, kSecAttrService, kSecClass,
        kSecClassGenericPassword, kSecReturnAttributes, kSecReturnData,
        kSecUseAuthenticationContext, kSecValueData,
    };
    use security_framework_sys::keychain_item::{SecItemAdd, SecItemCopyMatching, SecItemDelete};

    use super::{Biometry, VaultKeyStore};
    use crate::core_error::CoreError;
    use crate::crypto::VaultKey;

    /// The vault key, behind Touch ID or Face ID.
    const KEY_SERVICE: &str = "dev.marromugi.hush.vault-key";
    /// An item with no secret in it, whose presence says the person turned
    /// it on. Readable without Touch ID or Face ID.
    const ON_SERVICE: &str = "dev.marromugi.hush.vault-key-on";

    // Security.framework's `OSStatus` values, named as Rust constants so that
    // they can be matched on.
    const SUCCESS: i32 = security_framework_sys::base::errSecSuccess;
    const ITEM_NOT_FOUND: i32 = security_framework_sys::base::errSecItemNotFound;
    /// Touch ID or Face ID failed too many times (`errSecAuthFailed`).
    const AUTH_FAILED: i32 = security_framework_sys::base::errSecAuthFailed;
    /// The person cancelled the prompt (`errSecUserCanceled`).
    const USER_CANCELED: i32 = -128;

    /// The app's keychain on iOS. The key is kept on this device only, needs
    /// a device passcode, and is given out only after Touch ID or Face ID
    /// with the fingers or face set up when it was written.
    #[derive(Debug)]
    pub struct BiometricKeychain;

    /// A Security.framework constant as a `CFString`.
    macro_rules! sec {
        ($constant:ident) => {
            // SAFETY: the constants are static CFStrings owned by Security.framework.
            unsafe { CFString::wrap_under_get_rule($constant) }
        };
    }

    fn query(
        service: &str,
        vault_id: &str,
        extra: Vec<(CFString, CFType)>,
    ) -> CFDictionary<CFString, CFType> {
        let mut pairs = vec![
            (
                sec!(kSecClass),
                sec!(kSecClassGenericPassword).into_CFType(),
            ),
            (sec!(kSecAttrService), CFString::new(service).into_CFType()),
            (sec!(kSecAttrAccount), CFString::new(vault_id).into_CFType()),
        ];
        pairs.extend(extra);
        CFDictionary::from_CFType_pairs(&pairs)
    }

    /// An `LAContext` as a dictionary value for `kSecUseAuthenticationContext`.
    fn context_value(context: &LAContext) -> CFType {
        // SAFETY: every Objective-C object is a CFType, and the get rule
        // retains it for as long as the returned value lives.
        unsafe { CFType::wrap_under_get_rule(context as *const LAContext as CFTypeRef) }
    }

    fn copy_matching(query: &CFDictionary<CFString, CFType>) -> (i32, Option<CFType>) {
        let mut result: CFTypeRef = std::ptr::null();
        // SAFETY: `query` is a valid dictionary and `result` a valid out pointer.
        let status = unsafe { SecItemCopyMatching(query.as_concrete_TypeRef(), &mut result) };
        let result = (!result.is_null())
            // SAFETY: a non-null result is a new object owned by the caller.
            .then(|| unsafe { CFType::wrap_under_create_rule(result) });
        (status, result)
    }

    fn add(query: &CFDictionary<CFString, CFType>) -> Result<(), CoreError> {
        // SAFETY: `query` is a valid dictionary; no result is asked for.
        match unsafe { SecItemAdd(query.as_concrete_TypeRef(), std::ptr::null_mut()) } {
            SUCCESS => Ok(()),
            status => Err(CoreError::BiometricKeychain(status)),
        }
    }

    fn delete(service: &str, vault_id: &str) -> Result<(), CoreError> {
        let query = query(service, vault_id, Vec::new());
        // SAFETY: `query` is a valid dictionary.
        match unsafe { SecItemDelete(query.as_concrete_TypeRef()) } {
            SUCCESS | ITEM_NOT_FOUND => Ok(()),
            status => Err(CoreError::BiometricKeychain(status)),
        }
    }

    impl VaultKeyStore for BiometricKeychain {
        fn biometry(&self) -> Option<Biometry> {
            // SAFETY: a fresh context, used on this thread only.
            let context = unsafe { LAContext::new() };
            // Only sets `biometryType`, which it does whatever it returns: a
            // lockout or a refused Face ID still shows the kind the device has.
            let _ = unsafe {
                context.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
            };
            match unsafe { context.biometryType() } {
                LABiometryType::TouchID => Some(Biometry::TouchId),
                LABiometryType::FaceID => Some(Biometry::FaceId),
                LABiometryType::OpticID => Some(Biometry::OpticId),
                _ => None,
            }
        }

        fn is_on(&self, vault_id: &str) -> Result<bool, CoreError> {
            let query = query(
                ON_SERVICE,
                vault_id,
                vec![(
                    sec!(kSecReturnAttributes),
                    CFBoolean::true_value().into_CFType(),
                )],
            );
            match copy_matching(&query).0 {
                SUCCESS => Ok(true),
                ITEM_NOT_FOUND => Ok(false),
                status => Err(CoreError::BiometricKeychain(status)),
            }
        }

        fn set(&self, vault_id: &str, vault_key: &VaultKey) -> Result<(), CoreError> {
            delete(KEY_SERVICE, vault_id)?;
            let access = SecAccessControl::create_with_protection(
                Some(ProtectionMode::AccessibleWhenPasscodeSetThisDeviceOnly),
                AccessControlOptions::BIOMETRY_CURRENT_SET.bits(),
            )
            .map_err(|e| CoreError::BiometricKeychain(e.code()))?;
            // The CFData is a copy of the key that is not wiped; it is
            // released at the end of this call.
            add(&query(
                KEY_SERVICE,
                vault_id,
                vec![
                    (sec!(kSecAttrAccessControl), access.into_CFType()),
                    (
                        sec!(kSecValueData),
                        CFData::from_buffer(vault_key.as_bytes()).into_CFType(),
                    ),
                ],
            ))?;
            // Turned on only once the key is in: a failed turn-on stays off,
            // and a failed re-keep stays on to be tried again.
            if !self.is_on(vault_id)? {
                add(&query(
                    ON_SERVICE,
                    vault_id,
                    vec![(
                        sec!(kSecValueData),
                        CFData::from_buffer(b"on").into_CFType(),
                    )],
                ))?;
            }
            Ok(())
        }

        fn get(&self, vault_id: &str, reason: &str) -> Result<Option<VaultKey>, CoreError> {
            // SAFETY: a fresh context, used on this thread only.
            let context = unsafe { LAContext::new() };
            unsafe {
                context.setLocalizedReason(&NSString::from_str(reason));
                // No "Enter Password" button: the passphrase is the way back.
                context.setLocalizedFallbackTitle(Some(&NSString::new()));
            }
            let query = query(
                KEY_SERVICE,
                vault_id,
                vec![
                    (sec!(kSecReturnData), CFBoolean::true_value().into_CFType()),
                    (sec!(kSecUseAuthenticationContext), context_value(&context)),
                ],
            );
            match copy_matching(&query) {
                (SUCCESS, Some(data)) => {
                    // An unwiped copy of the key, released when `data` drops here.
                    let data = data
                        .downcast_into::<CFData>()
                        .ok_or(CoreError::BiometricKeychain(SUCCESS))?;
                    Ok(VaultKey::from_bytes(data.bytes()))
                }
                (ITEM_NOT_FOUND, _) => Ok(None),
                (USER_CANCELED, _) => Err(CoreError::BiometryCancelled),
                (AUTH_FAILED, _) => Err(CoreError::BiometryFailed),
                (status, _) => Err(CoreError::BiometricKeychain(status)),
            }
        }

        fn remove(&self, vault_id: &str) -> Result<(), CoreError> {
            delete(ON_SERVICE, vault_id)?;
            delete(KEY_SERVICE, vault_id)
        }
    }
}
