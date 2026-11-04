use std::fmt;

use serde::Serialize;

use crate::app_error::AppError;
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
pub trait VaultKeyStore: fmt::Debug + Send + Sync {
    /// `None` when the device has no biometry set up.
    fn biometry(&self) -> Option<Biometry>;
    /// Whether a key is kept for the vault. Asks the person for nothing.
    fn has(&self, vault_id: &str) -> Result<bool, AppError>;
    /// Keeps `key`, replacing any kept before, so that only the fingers or
    /// face set up right now can take it out again.
    fn set(&self, vault_id: &str, key: &VaultKey) -> Result<(), AppError>;
    /// Asks for Touch ID or Face ID, showing `reason` where the system has
    /// room for it. `None` when no key is kept or it no longer comes out.
    fn get(&self, vault_id: &str, reason: &str) -> Result<Option<VaultKey>, AppError>;
    fn remove(&self, vault_id: &str) -> Result<(), AppError>;
}

/// A device without Touch ID or Face ID: nothing is ever kept.
#[derive(Debug)]
pub struct NoBiometry;

impl VaultKeyStore for NoBiometry {
    fn biometry(&self) -> Option<Biometry> {
        None
    }

    fn has(&self, _: &str) -> Result<bool, AppError> {
        Ok(false)
    }

    fn set(&self, _: &str, _: &VaultKey) -> Result<(), AppError> {
        Err(AppError::NoBiometry)
    }

    fn get(&self, _: &str, _: &str) -> Result<Option<VaultKey>, AppError> {
        Ok(None)
    }

    fn remove(&self, _: &str) -> Result<(), AppError> {
        Ok(())
    }
}

/// Keys held in memory, behind a Touch ID that always matches unless told to
/// refuse, for tests.
#[cfg(test)]
#[derive(Debug, Default)]
pub struct MemoryVaultKeys {
    keys: std::sync::Mutex<std::collections::HashMap<String, Vec<u8>>>,
    /// Set to act as if the person cancelled the prompt.
    pub refuse: std::sync::atomic::AtomicBool,
}

#[cfg(test)]
impl MemoryVaultKeys {
    /// Puts raw bytes in place of a key, as a key from another vault would be.
    pub fn plant(&self, vault_id: &str, bytes: &[u8]) {
        let mut keys = self.keys.lock().unwrap();
        keys.insert(vault_id.to_string(), bytes.to_vec());
    }
}

#[cfg(test)]
impl VaultKeyStore for MemoryVaultKeys {
    fn biometry(&self) -> Option<Biometry> {
        Some(Biometry::TouchId)
    }

    fn has(&self, vault_id: &str) -> Result<bool, AppError> {
        Ok(self.keys.lock().unwrap().contains_key(vault_id))
    }

    fn set(&self, vault_id: &str, key: &VaultKey) -> Result<(), AppError> {
        self.plant(vault_id, key.as_bytes());
        Ok(())
    }

    fn get(&self, vault_id: &str, _: &str) -> Result<Option<VaultKey>, AppError> {
        if self.refuse.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(AppError::BiometryCancelled);
        }
        let keys = self.keys.lock().unwrap();
        Ok(keys
            .get(vault_id)
            .map(|bytes| VaultKey::from_bytes(bytes).unwrap()))
    }

    fn remove(&self, vault_id: &str) -> Result<(), AppError> {
        self.keys.lock().unwrap().remove(vault_id);
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
    use crate::app_error::AppError;
    use crate::crypto::VaultKey;

    const SERVICE: &str = "dev.marromugi.hush.vault-key";

    // Security.framework's `OSStatus` values, named as Rust constants so that
    // they can be matched on.
    const SUCCESS: i32 = security_framework_sys::base::errSecSuccess;
    const ITEM_NOT_FOUND: i32 = security_framework_sys::base::errSecItemNotFound;
    /// Touch ID or Face ID did not match (`AUTH_FAILED`).
    const AUTH_FAILED: i32 = security_framework_sys::base::errSecAuthFailed;
    /// The person cancelled the prompt (`errSecUserCanceled`).
    const USER_CANCELED: i32 = -128;
    /// The item needs the person, and this query asked not to involve them
    /// (`errSecInteractionNotAllowed`).
    const INTERACTION_NOT_ALLOWED: i32 = -25308;

    /// The app's keychain on iOS. Items are kept on this device only, need a
    /// device passcode, and are given out only after Touch ID or Face ID
    /// with the fingers or face set up when the item was written.
    #[derive(Debug)]
    pub struct BiometricKeychain;

    /// A Security.framework constant as a `CFString`.
    macro_rules! sec {
        ($constant:ident) => {
            // SAFETY: the constants are static CFStrings owned by Security.framework.
            unsafe { CFString::wrap_under_get_rule($constant) }
        };
    }

    fn query(vault_id: &str, extra: Vec<(CFString, CFType)>) -> CFDictionary<CFString, CFType> {
        let mut pairs = vec![
            (
                sec!(kSecClass),
                sec!(kSecClassGenericPassword).into_CFType(),
            ),
            (sec!(kSecAttrService), CFString::new(SERVICE).into_CFType()),
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

    impl VaultKeyStore for BiometricKeychain {
        fn biometry(&self) -> Option<Biometry> {
            // SAFETY: a fresh context, used on this thread only.
            let context = unsafe { LAContext::new() };
            unsafe {
                context.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
            }
            .ok()?;
            match unsafe { context.biometryType() } {
                LABiometryType::TouchID => Some(Biometry::TouchId),
                LABiometryType::FaceID => Some(Biometry::FaceId),
                LABiometryType::OpticID => Some(Biometry::OpticId),
                _ => None,
            }
        }

        fn has(&self, vault_id: &str) -> Result<bool, AppError> {
            // SAFETY: a fresh context, used on this thread only.
            let context = unsafe { LAContext::new() };
            unsafe { context.setInteractionNotAllowed(true) };
            let query = query(
                vault_id,
                vec![
                    (
                        sec!(kSecReturnAttributes),
                        CFBoolean::true_value().into_CFType(),
                    ),
                    (sec!(kSecUseAuthenticationContext), context_value(&context)),
                ],
            );
            match copy_matching(&query).0 {
                SUCCESS | INTERACTION_NOT_ALLOWED => Ok(true),
                ITEM_NOT_FOUND => Ok(false),
                status => Err(AppError::BiometricKeychain(status)),
            }
        }

        fn set(&self, vault_id: &str, vault_key: &VaultKey) -> Result<(), AppError> {
            self.remove(vault_id)?;
            let access = SecAccessControl::create_with_protection(
                Some(ProtectionMode::AccessibleWhenPasscodeSetThisDeviceOnly),
                AccessControlOptions::BIOMETRY_CURRENT_SET.bits(),
            )
            .map_err(|e| AppError::BiometricKeychain(e.code()))?;
            let query = query(
                vault_id,
                vec![
                    (sec!(kSecAttrAccessControl), access.into_CFType()),
                    (
                        sec!(kSecValueData),
                        CFData::from_buffer(vault_key.as_bytes()).into_CFType(),
                    ),
                ],
            );
            // SAFETY: `query` is a valid dictionary; no result is asked for.
            match unsafe { SecItemAdd(query.as_concrete_TypeRef(), std::ptr::null_mut()) } {
                SUCCESS => Ok(()),
                status => Err(AppError::BiometricKeychain(status)),
            }
        }

        fn get(&self, vault_id: &str, reason: &str) -> Result<Option<VaultKey>, AppError> {
            // SAFETY: a fresh context, used on this thread only.
            let context = unsafe { LAContext::new() };
            unsafe {
                context.setLocalizedReason(&NSString::from_str(reason));
                // No "Enter Password" button: the passphrase is the way back.
                context.setLocalizedFallbackTitle(Some(&NSString::new()));
            }
            let query = query(
                vault_id,
                vec![
                    (sec!(kSecReturnData), CFBoolean::true_value().into_CFType()),
                    (sec!(kSecUseAuthenticationContext), context_value(&context)),
                ],
            );
            match copy_matching(&query) {
                (SUCCESS, Some(data)) => {
                    let data = data
                        .downcast_into::<CFData>()
                        .ok_or(AppError::BiometricKeychain(SUCCESS))?;
                    Ok(VaultKey::from_bytes(data.bytes()))
                }
                (ITEM_NOT_FOUND, _) => Ok(None),
                (USER_CANCELED | AUTH_FAILED, _) => Err(AppError::BiometryCancelled),
                (status, _) => Err(AppError::BiometricKeychain(status)),
            }
        }

        fn remove(&self, vault_id: &str) -> Result<(), AppError> {
            let query = query(vault_id, Vec::new());
            // SAFETY: `query` is a valid dictionary.
            match unsafe { SecItemDelete(query.as_concrete_TypeRef()) } {
                SUCCESS | ITEM_NOT_FOUND => Ok(()),
                status => Err(AppError::BiometricKeychain(status)),
            }
        }
    }
}
