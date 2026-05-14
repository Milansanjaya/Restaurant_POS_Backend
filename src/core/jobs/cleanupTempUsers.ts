import User from "../../modules/users/user.model";

/**
 * Cleanup job to delete expired temporary demo users
 * Runs every 5 minutes to remove demo users whose session has expired
 */
export const startCleanupJob = () => {
  // Run cleanup every 5 minutes
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find and delete all temporary users whose expiration time has passed
      const result = await User.deleteMany({
        is_temporary: true,
        demo_expires_at: { $lt: now }
      });

      if (result.deletedCount > 0) {
        console.log(`[CLEANUP JOB] Deleted ${result.deletedCount} expired demo users`);
      }
    } catch (error: any) {
      console.error("[CLEANUP JOB] Error deleting expired demo users:", error.message);
    }
  }, CLEANUP_INTERVAL);

  console.log("[CLEANUP JOB] Started: Temporary user cleanup runs every 5 minutes");
};

/**
 * Manual cleanup function (can be called on-demand)
 */
export const cleanupExpiredDemoUsers = async () => {
  try {
    const now = new Date();
    const result = await User.deleteMany({
      is_temporary: true,
      demo_expires_at: { $lt: now }
    });

    console.log(`[MANUAL CLEANUP] Deleted ${result.deletedCount} expired demo users`);
    return result.deletedCount;
  } catch (error: any) {
    console.error("[MANUAL CLEANUP] Error:", error.message);
    throw error;
  }
};
