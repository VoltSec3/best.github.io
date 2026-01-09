// Discord Status Integration
// This script fetches Discord presence status and updates the UI

class DiscordStatus {
    constructor(userId, apiEndpoint = null) {
        this.userId = userId;
        // Default to Lanyard API (no backend needed!)
        // If you have your own backend, set apiEndpoint to your server URL
        this.apiEndpoint = apiEndpoint || `https://api.lanyard.rest/v1/users/${userId}`;
        this.updateInterval = 10000; // Update every 10 seconds for live updates
        this.statusElement = null;
        this.lastOnlineElement = null;
        this.currentStatus = null;
        this.lastSeenTime = null;
        this.lastOnlineTime = null; // Store when we last saw them online
        this.currentActivity = null; // Store current activity data
        this.loadingScreen = null;
        this.isLoaded = false;
        this.init();
    }

    init() {
        // Create and show loading screen
        this.createLoadingScreen();
        
        // Find the status indicator element
        this.statusElement = document.querySelector('.weao-_063a0c');
        this.lastOnlineElement = document.querySelector('.weao-_861c50');
        // Find the status dot indicator (weao-_156104)
        this.statusDot = document.querySelector('.weao-_156104');
        
        // Remove gradient class from status dot so we can apply solid colors
        if (this.statusDot) {
            this.statusDot.classList.remove('weao-_28611c');
        }
        
        // Initial fetch
        this.updateStatus();
        
        // Set up periodic updates
        setInterval(() => this.updateStatus(), this.updateInterval);
        
        // Update activity text every second when online/idle/dnd
        setInterval(() => this.updateActivityText(), 1000);
    }
    
    createLoadingScreen() {
        // Create loading overlay
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.id = 'discord-status-loading';
        this.loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(10px);
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #5865f2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        this.loadingScreen.appendChild(spinner);
        document.body.appendChild(this.loadingScreen);
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen && !this.isLoaded) {
            this.isLoaded = true;
            this.loadingScreen.style.opacity = '0';
            this.loadingScreen.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                }
            }, 500);
        }
    }
    
    updateActivityText() {
        if (!this.lastOnlineElement || !this.currentStatus) return;
        
        // Only update if user is online/idle/dnd
        if (this.currentStatus === 'online' || this.currentStatus === 'idle' || this.currentStatus === 'dnd') {
            const activityText = this.formatActivity(this.currentActivity);
            if (activityText) {
                this.lastOnlineElement.textContent = activityText;
                this.lastOnlineElement.style.display = 'block';
            } else {
                // No activity, hide the element
                this.lastOnlineElement.style.display = 'none';
            }
        }
    }
    
    formatActivity(activity) {
        if (!activity) return null;
        
        // Handle different activity types
        if (activity.type === 0) {
            // Playing a game
            return `Playing: ${activity.name}`;
        } else if (activity.type === 2) {
            // Listening to Spotify
            // Spotify activities have details (song) and state (artist)
            const song = activity.details || activity.name;
            const artist = activity.state || '';
            
            if (artist) {
                return `Listening to ${song} by ${artist}`;
            } else {
                return `Listening to ${song}`;
            }
        } else if (activity.type === 4) {
            // Custom status
            return activity.state || activity.name || null;
        } else if (activity.type === 1) {
            // Streaming
            return `Streaming: ${activity.name}`;
        } else if (activity.type === 3) {
            // Watching
            return `Watching: ${activity.name}`;
        } else if (activity.name) {
            // Fallback for other activity types
            return activity.name;
        }
        
        return null;
    }

    async updateStatus() {
        try {
            let response, data;
            
            // Check if using Lanyard API or custom backend
            if (this.apiEndpoint.includes('lanyard.rest')) {
                // Lanyard API format
                response = await fetch(this.apiEndpoint);
                const lanyardData = await response.json();
                
                if (lanyardData.success && lanyardData.data) {
                    const presence = lanyardData.data;
                    // Get last seen time - use the most recent activity timestamp or current time if online
                    let lastSeen = null;
                    if (presence.discord_status === 'offline') {
                        // When offline, try to get last seen from activities or use a fallback
                        if (presence.activities && presence.activities.length > 0) {
                            const activity = presence.activities.find(a => a.timestamps?.start) || presence.activities[0];
                            if (activity?.timestamps?.start) {
                                lastSeen = new Date(activity.timestamps.start).toISOString();
                            }
                        }
                        // If no activity timestamp, we'll show "Unknown"
                    }
                    
                    // Get the primary activity (prefer game/spotify over custom status)
                    let primaryActivity = null;
                    if (presence.activities && presence.activities.length > 0) {
                        // Prefer game (type 0) or Spotify (type 2) over custom status (type 4)
                        primaryActivity = presence.activities.find(a => a.type === 0 || a.type === 2) 
                            || presence.activities.find(a => a.type === 1 || a.type === 3)
                            || presence.activities[0];
                    }
                    
                    data = {
                        success: true,
                        status: presence.discord_status || 'offline',
                        lastSeen: lastSeen,
                        activity: primaryActivity
                    };
                } else {
                    data = { success: false, error: 'Lanyard API returned no data' };
                }
            } else {
                // Custom backend API format
                response = await fetch(`${this.apiEndpoint}?userId=${this.userId}`);
                data = await response.json();
            }
            
            if (data.success) {
                this.updateUI(data.status, data.lastSeen, data.activity);
            } else {
                console.error('Discord status error:', data.error);
                this.setOffline();
            }
        } catch (error) {
            console.error('Failed to fetch Discord status:', error);
            this.setOffline();
        }
    }

    updateUI(status, lastSeen, activity = null) {
        if (!this.statusElement) return;

        // Store current status and activity
        this.currentStatus = status;
        this.lastSeenTime = lastSeen;
        this.currentActivity = activity;

        // Hide loading screen after first successful update
        this.hideLoadingScreen();

        // Remove existing status classes
        this.statusElement.classList.remove('weao-_063a0c', 'weao-_6618f1');
        
        // Remove existing color classes from status dot
        if (this.statusDot) {
            this.statusDot.classList.remove('status-online', 'status-idle', 'status-dnd', 'status-offline');
        }
        
        if (status === 'online' || status === 'idle' || status === 'dnd') {
            // User is online - store current time as last online time
            this.lastOnlineTime = new Date().toISOString();
            
            // User is online
            this.statusElement.className = 'weao-_063a0c weao-_28611c';
            this.statusElement.textContent = this.getStatusText(status);
            
            // Show activity text (live updating)
            if (this.lastOnlineElement) {
                const activityText = this.formatActivity(activity);
                if (activityText) {
                    this.lastOnlineElement.textContent = activityText;
                    this.lastOnlineElement.style.display = 'block';
                } else {
                    // No activity, hide the element
                    this.lastOnlineElement.style.display = 'none';
                }
            }
            
            // Set color based on status
            this.setStatusColor(status);
        } else {
            // User is offline
            this.statusElement.className = 'weao-_063a0c weao-_28611c';
            this.statusElement.textContent = 'Offline';
            
            // Show "Last online" with actual last seen time when offline
            // Use stored lastOnlineTime if available, otherwise use lastSeen from API
            if (this.lastOnlineElement) {
                const timeToShow = this.lastOnlineTime || lastSeen;
                if (timeToShow) {
                    this.lastOnlineElement.textContent = `Last online: ${this.formatDate(timeToShow)}`;
                } else {
                    this.lastOnlineElement.textContent = 'Last online: Unknown';
                }
                this.lastOnlineElement.style.display = 'block';
            }
            
            // Set offline color (red)
            this.setStatusColor('offline');
        }
    }
    
    setStatusColor(status) {
        const color = this.getStatusColor(status);
        
        // Set background color for status text element (weao-_063a0c)
        this.statusElement.style.backgroundColor = color;
        this.statusElement.style.color = '#ffffff'; // White text for better contrast
        
        // Set background color for status dot indicator (weao-_156104)
        if (this.statusDot) {
            // Remove gradient class if it exists
            this.statusDot.classList.remove('weao-_28611c');
            // Apply solid background color
            this.statusDot.style.backgroundColor = color;
            this.statusDot.style.background = color;
            // Add class for potential CSS styling
            this.statusDot.classList.add(`status-${status}`);
        }
    }
    
    getStatusColor(status) {
        const colorMap = {
            'online': '#22c55e',      // Green
            'idle': '#eab308',        // Yellow
            'dnd': '#eab308',         // Yellow (same as idle)
            'offline': '#ef4444'      // Red
        };
        return colorMap[status] || '#6b7280'; // Default gray
    }

    setOffline() {
        this.currentStatus = 'offline';
        this.hideLoadingScreen();
        
        if (this.statusElement) {
            this.statusElement.className = 'weao-_063a0c weao-_28611c';
            this.statusElement.textContent = 'Offline';
            this.setStatusColor('offline');
        }
        
        // Show "Last online" with last seen time if available
        if (this.lastOnlineElement) {
            const timeToShow = this.lastOnlineTime || this.lastSeenTime;
            if (timeToShow) {
                this.lastOnlineElement.textContent = `Last online: ${this.formatDate(timeToShow)}`;
            } else {
                this.lastOnlineElement.textContent = 'Last online: Unknown';
            }
            this.lastOnlineElement.style.display = 'block';
        }
    }

    getStatusText(status) {
        const statusMap = {
            'online': 'Online',
            'idle': 'Idle',
            'dnd': 'Do Not Disturb',
            'offline': 'Offline'
        };
        return statusMap[status] || 'Unknown';
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC'
        }) + ' UTC';
    }
}

// Initialize Discord status when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Replace 'YOUR_DISCORD_USER_ID' with your actual Discord user ID
        // You can find this by enabling Developer Mode in Discord and right-clicking your profile
        const discordUserId = window.DISCORD_USER_ID || 'YOUR_DISCORD_USER_ID';
        new DiscordStatus(discordUserId);
    });
} else {
    const discordUserId = window.DISCORD_USER_ID || 'YOUR_DISCORD_USER_ID';
    new DiscordStatus(discordUserId);
}

