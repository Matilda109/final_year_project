import { supabase } from "./supabase";

const SESSION_KEY = "tab_session_token";
const HEARTBEAT_KEY = "tab_session_heartbeat";

/**
 * Tab Session Manager (disabled)
 * Multiple tab sessions are now allowed
 */
export class TabSessionManager {
  private static instance: TabSessionManager;
  private sessionToken: string;
  
  private constructor() {
    this.sessionToken = this.generateToken();
  }
  
  public static getInstance(): TabSessionManager {
    if (!TabSessionManager.instance) {
      TabSessionManager.instance = new TabSessionManager();
    }
    return TabSessionManager.instance;
  }
  
  /**
   * Initialize the session tracking (disabled)
   */
  public initialize(onSessionInvalid: () => void): void {
    // Functionality disabled - multiple sessions now allowed
    return;
  }
  
  /**
   * Handle user logout
   * @param redirectUrl The URL to redirect to after logout (defaults to /login)
   * @param showFeedback Whether to show a feedback message to the user (defaults to true)
   * @returns Promise<boolean> indicating whether logout was successful
   */
  public async logout(redirectUrl = '/login', showFeedback = true): Promise<boolean> {
    try {
      if (showFeedback) {
        // Show logout in progress message
        const feedbackElement = document.createElement('div');
        feedbackElement.style.position = 'fixed';
        feedbackElement.style.top = '20px';
        feedbackElement.style.left = '50%';
        feedbackElement.style.transform = 'translateX(-50%)';
        feedbackElement.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
        feedbackElement.style.color = 'white';
        feedbackElement.style.padding = '10px 20px';
        feedbackElement.style.borderRadius = '4px';
        feedbackElement.style.zIndex = '9999';
        feedbackElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        feedbackElement.innerText = 'Logging out...';
        document.body.appendChild(feedbackElement);
      }
      
      // Clear any local storage items that might contain session data
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(HEARTBEAT_KEY);
      
      // Clear any session cookies
      document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear Supabase session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        return false;
      }
      
      // Add a small delay before redirecting to ensure everything is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
      
      return true;
    } catch (error) {
      console.error("Error logging out:", error);
      // Still try to redirect even if there was an error
      if (typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
      return false;
    }
  }
  
  /**
   * Terminate sessions
   */
  public async terminateAllSessions(): Promise<boolean> {
    try {
      // Clear Supabase session
      const { error } = await supabase.auth.signOut();
      return !error;
    } catch (error) {
      console.error("Error terminating sessions:", error);
      return false;
    }
  }
  
  /**
   * Generate a random session token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export default TabSessionManager.getInstance(); 