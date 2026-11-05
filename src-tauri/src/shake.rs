//! Tells the frontend when the phone is shaken, so it can change the font.
//!
//! The motion sensor is read natively: in the webview it would need a
//! permission prompt, and the simulator's "Shake" menu item sends no motion
//! data either way. iOS's own shake-to-undo is turned off, so a shake while
//! typing changes the font instead of asking to undo the typing.

use tauri::AppHandle;

/// The event the frontend listens to after the phone has been shaken.
pub const SHAKEN: &str = "shaken";

/// How hard a jolt must be, in g, with gravity taken out. Walking stays well under it.
const JOLT_G: f64 = 1.5;
/// How many jolts count as a shake, and the time they must fall within, in seconds.
const JOLTS: usize = 3;
const WITHIN_S: f64 = 0.8;
/// How long after a shake the next one is not heard, so one long shake changes the font once.
const REST_S: f64 = 1.2;

/// Turns motion samples into shakes: a few hard jolts close together. A
/// jolt is the moment the motion rises past `JOLT_G`, so one swing held
/// above it counts once.
#[derive(Default)]
pub struct ShakeDetector {
    above: bool,
    jolts: Vec<f64>,
    rest_until: f64,
}

impl ShakeDetector {
    /// Takes one sample, its time in seconds and its strength in g, and
    /// says whether it completes a shake.
    pub fn feed(&mut self, time: f64, strength: f64) -> bool {
        let rising = strength >= JOLT_G && !self.above;
        self.above = strength >= JOLT_G;
        if !rising || time < self.rest_until {
            return false;
        }
        self.jolts.retain(|&jolt| time - jolt <= WITHIN_S);
        self.jolts.push(time);
        if self.jolts.len() < JOLTS {
            return false;
        }
        self.jolts.clear();
        self.rest_until = time + REST_S;
        true
    }
}

#[cfg(target_os = "ios")]
mod ios {
    use std::cell::RefCell;

    use block2::RcBlock;
    use objc2::MainThreadMarker;
    use objc2_core_motion::{CMDeviceMotion, CMMotionManager};
    use objc2_foundation::{NSError, NSOperationQueue};
    use objc2_ui_kit::UIApplication;
    use tauri::{AppHandle, Emitter};

    use super::{SHAKEN, ShakeDetector};

    /// Samples per second; a shake's swings are a few per second.
    const RATE_HZ: f64 = 50.0;

    pub fn watch(mtm: MainThreadMarker, app: AppHandle) {
        UIApplication::sharedApplication(mtm).setApplicationSupportsShakeToEdit(false);

        // SAFETY: CoreMotion is used from the main thread, and the handler is
        // called on the main queue, one sample at a time.
        unsafe {
            let manager = CMMotionManager::new();
            if !manager.isDeviceMotionAvailable() {
                return;
            }
            manager.setDeviceMotionUpdateInterval(1.0 / RATE_HZ);
            let detector = RefCell::new(ShakeDetector::default());
            let handler = RcBlock::new(move |motion: *mut CMDeviceMotion, _error: *mut NSError| {
                let Some(motion) = motion.as_ref() else {
                    return;
                };
                let a = motion.userAcceleration();
                let strength = (a.x * a.x + a.y * a.y + a.z * a.z).sqrt();
                if detector.borrow_mut().feed(motion.timestamp(), strength) {
                    // Nothing to do if no window listens; no diary is open then.
                    let _ = app.emit(SHAKEN, ());
                }
            });
            manager.startDeviceMotionUpdatesToQueue_withHandler(
                &NSOperationQueue::mainQueue(),
                RcBlock::as_ptr(&handler),
            );
            // Kept for the rest of the process; iOS pauses it while the app is in the background.
            std::mem::forget(manager);
        }
    }
}

/// Starts emitting `SHAKEN` on iOS each time the phone is shaken.
#[cfg(target_os = "ios")]
pub fn watch(app: &AppHandle) -> tauri::Result<()> {
    let handle = app.clone();
    app.run_on_main_thread(move || {
        if let Some(mtm) = objc2::MainThreadMarker::new() {
            ios::watch(mtm, handle);
        }
    })
}

/// A desktop cannot be shaken.
#[cfg(not(target_os = "ios"))]
pub fn watch(_app: &AppHandle) -> tauri::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Feeds `(time, strength)` samples and returns the times that completed a shake.
    fn shakes(samples: &[(f64, f64)]) -> Vec<f64> {
        let mut detector = ShakeDetector::default();
        samples
            .iter()
            .filter(|&&(time, strength)| detector.feed(time, strength))
            .map(|&(time, _)| time)
            .collect()
    }

    /// A swing back and forth: hard, then still, `count` times, 0.1 s apart from `start`.
    fn swings(start: f64, count: usize) -> Vec<(f64, f64)> {
        (0..count)
            .flat_map(|i| {
                let time = start + i as f64 * 0.2;
                [(time, 2.0), (time + 0.1, 0.2)]
            })
            .collect()
    }

    #[test]
    fn three_hard_swings_close_together_are_a_shake() {
        assert_eq!(shakes(&swings(0.0, 3)), vec![0.4]);
    }

    #[test]
    fn a_single_bump_is_not_a_shake() {
        assert!(shakes(&[(0.0, 3.0), (0.02, 3.0), (0.04, 0.1)]).is_empty());
    }

    #[test]
    fn walking_is_not_a_shake() {
        let steps: Vec<_> = (0..40)
            .map(|i| (i as f64 * 0.05, if i % 2 == 0 { 1.0 } else { 0.1 }))
            .collect();
        assert!(shakes(&steps).is_empty());
    }

    #[test]
    fn jolts_too_far_apart_are_not_a_shake() {
        assert!(shakes(&[(0.0, 2.0), (0.1, 0.1), (0.6, 2.0), (0.7, 0.1), (1.2, 2.0)]).is_empty());
    }

    #[test]
    fn a_long_shake_changes_the_font_once_then_again_after_a_rest() {
        assert_eq!(shakes(&swings(0.0, 8)), vec![0.4]);
        assert_eq!(shakes(&swings(0.0, 14)), vec![0.4, 2.0]);
    }
}
