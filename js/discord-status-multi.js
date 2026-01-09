// Multi-User Discord Status Integration
// Handles multiple users with dynamic card generation

class MultiUserDiscordStatus {
    constructor(usersConfig, containerSelector = '.users-container') {
        this.usersConfig = usersConfig;
        this.container = document.querySelector(containerSelector);
        this.users = new Map();
        this.updateInterval = 5000; // Update every 5 seconds
        this.loadingScreen = null;
        this.isLoaded = false;
        this.init();
    }

    init() {
        // Style the container with padding between cards
        if (this.container) {
            this.container.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 13.5px;
                padding: 0;
            `;
        }
        
        // Create and show loading screen
        this.createLoadingScreen();
        
        // Create user cards
        this.createUserCards();
        
        // Set up click outside listener to close all cards
        this.setupClickOutsideListener();
        
        // Initial fetch for all users
        this.updateAllUsers();
        
        // Set up periodic updates
        setInterval(() => this.updateAllUsers(), this.updateInterval);
        
        // Update activity text every second
        setInterval(() => this.updateAllActivityTexts(), 1000);
    }

    setupClickOutsideListener() {
        // Close all cards when clicking outside any card
        document.addEventListener('click', (e) => {
            let clickedOnCard = false;
            
            this.users.forEach((user) => {
                if (user.cardElement && user.cardElement.contains(e.target)) {
                    clickedOnCard = true;
                }
            });
            
            // If clicked outside all cards, close all expanded cards
            if (!clickedOnCard) {
                this.closeAllCards();
            }
        });
    }

    createLoadingScreen() {
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
            this.loadingScreen.style.transition = 'opacity 0.35s ease-out';
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                }
            }, 350);
        }
    }

    createUserCards() {
        if (!this.container) return;

        this.usersConfig.forEach((userConfig, index) => {
            const userCard = this.createUserCardHTML(userConfig, index);
            
            // Add fade-in animation for card appearance (faster: 0.35s)
            userCard.style.opacity = '0';
            userCard.style.transform = 'translateY(20px)';
            userCard.style.transition = 'opacity 0.35s ease-in-out, transform 0.35s ease-in-out';
            
            this.container.appendChild(userCard);
            
            // Fade in the card (faster stagger: 75ms)
            setTimeout(() => {
                userCard.style.opacity = '1';
                userCard.style.transform = 'translateY(0)';
            }, index * 75); // Stagger the animations
            
            // Get references to expandable elements
            const expandable = userCard.querySelector('.weao-_ac2f06');
            const trigger = userCard;
            
            // Store user data
            this.users.set(userConfig.discordUserId, {
                config: userConfig,
                cardElement: userCard,
                statusElement: userCard.querySelector('.weao-_063a0c'),
                activityElement: userCard.querySelector('.weao-_861c50'),
                statusDot: userCard.querySelector('.weao-_156104'),
                currentStatus: null,
                currentActivity: null,
                lastOnlineTime: null,
                lastSeenTime: null,
                isDetected: false,
                expandable: expandable,
                trigger: trigger
            });
        });
    }

    createUserCardHTML(userConfig, index) {
        const card = document.createElement('div');
        card.className = 'weao-_c4fbb0';
        card.style.cssText = 'position: relative;';
        card.setAttribute('data-user-id', userConfig.discordUserId);
        
        card.innerHTML = `
            <div class="weao-_667c3f" style="will-change: transform, opacity; opacity: 1;">
                <div class="weao-_156104 weao-_28611c"></div>
                <div class="weao-_216efe">
                    <div class="weao-_132ead">
                        <div class="weao-_6618f1">
                            <div class="weao-_620f87">
                                <h3 class="weao-_457331">${this.escapeHtml(userConfig.name)}</h3>
                                ${userConfig.badge ? `<div class="weao-_8c0232">
                                    <span class="weao-_557f23" title="${this.escapeHtml(userConfig.badgeTitle || '')}">${this.escapeHtml(userConfig.badge)}</span>
                                </div>` : ''}
                            </div>
                            <p class="weao-_861c50" style="display: none;"></p>
                        </div>
                    </div>
                    <span class="weao-_063a0c weao-_28611c">Loading...</span>
                    <div class="weao-_ac2f06" style="display: none; opacity: 0; height: 0; overflow: hidden;">
                        <div class="weao-_a4d3cf">
                            <div class="weao-_75104e weao-_54d16f">
                                <div class="weao-_1863f0">
                                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <span>${this.escapeHtml(userConfig.flavorText)}</span>
                            </div>
                            <div class="weao-_86a057">
                                ${userConfig.website ? `<a href="${this.escapeHtml(userConfig.website)}" target="_blank" rel="noopener noreferrer" class="weao-_367679">
                                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 496 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M336.5 160C322 70.7 287.8 8 248 8s-74 62.7-88.5 152h177zM152 256c0 22.2 1.2 43.5 3.3 64h185.3c2.1-20.5 3.3-41.8 3.3-64s-1.2-43.5-3.3-64H155.3c-2.1 20.5-3.3 41.8-3.3 64zm324.7-96c-28.6-67.9-86.5-120.4-158-141.6 24.4 33.8 41.2 84.7 50 141.6h108zM177.2 18.4C105.8 39.6 47.8 92.1 19.3 160h108c8.7-56.9 25.5-107.8 49.9-141.6zM487.4 192H372.7c2.1 21 3.3 42.5 3.3 64s-1.2 43-3.3 64h114.6c5.5-20.5 8.6-41.8 8.6-64s-3.1-43.5-8.5-64zM120 256c0-21.5 1.2-43 3.3-64H8.6C3.2 212.5 0 233.8 0 256s3.2 43.5 8.6 64h114.6c-2-21-3.2-42.5-3.2-64zm39.5 96c14.5 89.3 48.7 152 88.5 152s74-62.7 88.5-152h-177zm159.3 141.6c71.4-21.2 129.4-73.7 158-141.6h-108c-8.8 56.9-25.6 107.8-50 141.6zM19.3 352c28.6 67.9 86.5 120.4 158 141.6-24.4-33.8-41.2-84.7-50-141.6h-108z"></path>
                                    </svg> Website</a>` : ''}
                                ${userConfig.discord ? `<a href="${this.escapeHtml(userConfig.discord)}" target="_blank" rel="noopener noreferrer" class="weao-_367679">
                                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path>
                                    </svg> Discord</a>` : ''}
                            </div>
                            <div class="weao-_c44e9c"><span class="weao-_1015a8">sTARD: 100%</span><span class="weao-_1015a8">TARD: 100%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set up click handler for expandable panel
        const trigger = card; // The card itself is the trigger
        const panel = card.querySelector('.weao-_216efe');
        const expandable = card.querySelector('.weao-_ac2f06');
        
        // Add fade transition styles (faster: 0.35s)
        if (expandable) {
            expandable.style.transition = 'opacity 0.35s ease-in-out, height 0.35s ease-in-out';
            expandable.style.opacity = '0';
            expandable.style.height = '0';
            expandable.style.overflow = 'hidden';
        }
        
        if (trigger && panel && expandable) {
            trigger.addEventListener('click', (e) => {
                // Don't trigger if clicking on links
                if (e.target.closest('a')) return;
                
                const isOpen = expandable.classList.contains('weao-_ef563d');
                
                if (isOpen) {
                    // Close the panel with fade out
                    this.closeCard(expandable);
                } else {
                    // Close all other open cards first
                    this.closeAllCards();
                    // Open this panel with fade in
                    this.openCard(expandable);
                }
            });
        }
        
        return card;
        
        // Close panel when clicking outside (single event listener for all cards)
        // This is set up once in init() after all cards are created

        return card;
    }

    openCard(expandable) {
        if (!expandable) return;
        
        // Set display first, then animate
        expandable.style.display = 'block';
        
        // Get the natural height
        expandable.style.height = 'auto';
        const height = expandable.scrollHeight;
        expandable.style.height = '0';
        
        // Trigger fade in animation
        requestAnimationFrame(() => {
            expandable.classList.add('weao-_ef563d');
            expandable.style.height = height + 'px';
            expandable.style.opacity = '1';
        });
    }

    closeCard(expandable) {
        if (!expandable) return;
        
        // Get current height before closing
        const height = expandable.scrollHeight;
        expandable.style.height = height + 'px';
        
        // Fade out and collapse
        requestAnimationFrame(() => {
            expandable.style.opacity = '0';
            expandable.style.height = '0';
            expandable.classList.remove('weao-_ef563d');
            
            // Hide after animation completes (350ms)
            setTimeout(() => {
                expandable.style.display = 'none';
            }, 350);
        });
    }

    closeAllCards() {
        this.users.forEach((user) => {
            if (user.expandable && user.expandable.classList.contains('weao-_ef563d')) {
                this.closeCard(user.expandable);
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async updateAllUsers() {
        const promises = Array.from(this.users.keys()).map(userId => 
            this.updateUserStatus(userId)
        );
        
        await Promise.all(promises);
        
        // Hide users that aren't detected
        this.hideUndetectedUsers();
        
        // Hide loading screen after first update
        this.hideLoadingScreen();
    }

    async updateUserStatus(userId) {
        const user = this.users.get(userId);
        if (!user) return;

        try {
            const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
            const lanyardData = await response.json();
            
            if (lanyardData.success && lanyardData.data) {
                const presence = lanyardData.data;
                user.isDetected = true;
                
                // Get last seen time
                let lastSeen = null;
                if (presence.discord_status === 'offline') {
                    if (presence.activities && presence.activities.length > 0) {
                        const activity = presence.activities.find(a => a.timestamps?.start) || presence.activities[0];
                        if (activity?.timestamps?.start) {
                            lastSeen = new Date(activity.timestamps.start).toISOString();
                        }
                    }
                }
                
                // Get primary activity
                let primaryActivity = null;
                if (presence.activities && presence.activities.length > 0) {
                    primaryActivity = presence.activities.find(a => a.type === 0 || a.type === 2) 
                        || presence.activities.find(a => a.type === 1 || a.type === 3)
                        || presence.activities[0];
                }
                
                this.updateUserUI(userId, presence.discord_status || 'offline', lastSeen, primaryActivity);
            } else {
                // User not detected by Lanyard
                user.isDetected = false;
            }
        } catch (error) {
            console.error(`Failed to fetch status for user ${userId}:`, error);
            user.isDetected = false;
        }
    }

    updateUserUI(userId, status, lastSeen, activity) {
        const user = this.users.get(userId);
        if (!user || !user.statusElement) return;

        user.currentStatus = status;
        user.currentActivity = activity;
        user.lastSeenTime = lastSeen;

        // Remove existing classes
        user.statusElement.classList.remove('weao-_063a0c', 'weao-_6618f1');
        if (user.statusDot) {
            user.statusDot.classList.remove('status-online', 'status-idle', 'status-dnd', 'status-offline', 'weao-_28611c');
        }

        if (status === 'online' || status === 'idle' || status === 'dnd') {
            user.lastOnlineTime = new Date().toISOString();
            user.statusElement.className = 'weao-_063a0c weao-_28611c';
            user.statusElement.textContent = this.getStatusText(status);
            
            if (user.activityElement) {
                const activityText = this.formatActivity(activity);
                if (activityText) {
                    user.activityElement.textContent = activityText;
                    user.activityElement.style.display = 'block';
                } else {
                    user.activityElement.style.display = 'none';
                }
            }
            
            this.setStatusColor(user, status);
        } else {
            user.statusElement.className = 'weao-_063a0c weao-_28611c';
            user.statusElement.textContent = 'Offline';
            
            if (user.activityElement) {
                const timeToShow = user.lastOnlineTime || lastSeen;
                if (timeToShow) {
                    user.activityElement.textContent = `Last online: ${this.formatDate(timeToShow)}`;
                } else {
                    user.activityElement.textContent = 'User is currently offline!';
                }
                user.activityElement.style.display = 'block';
            }
            
            this.setStatusColor(user, 'offline');
        }
    }

    updateAllActivityTexts() {
        this.users.forEach((user, userId) => {
            if (!user.activityElement || !user.currentStatus) return;
            
            if (user.currentStatus === 'online' || user.currentStatus === 'idle' || user.currentStatus === 'dnd') {
                const activityText = this.formatActivity(user.currentActivity);
                if (activityText) {
                    user.activityElement.textContent = activityText;
                    user.activityElement.style.display = 'block';
                } else {
                    user.activityElement.style.display = 'none';
                }
            }
        });
    }

    hideUndetectedUsers() {
        this.users.forEach((user, userId) => {
            if (!user.isDetected && user.cardElement) {
                // Fade out before hiding (350ms)
                user.cardElement.style.opacity = '0';
                user.cardElement.style.transform = 'translateY(-15px)';
                setTimeout(() => {
                    if (user.cardElement) {
                        user.cardElement.style.display = 'none';
                    }
                }, 350);
            } else if (user.isDetected && user.cardElement) {
                // Fade in when detected
                if (user.cardElement.style.display === 'none') {
                    user.cardElement.style.display = 'block';
                    user.cardElement.style.opacity = '0';
                    user.cardElement.style.transform = 'translateY(15px)';
                    setTimeout(() => {
                        if (user.cardElement) {
                            user.cardElement.style.opacity = '1';
                            user.cardElement.style.transform = 'translateY(0)';
                        }
                    }, 10);
                }
            }
        });
    }

    setStatusColor(user, status) {
        const color = this.getStatusColor(status);
        
        if (user.statusElement) {
            user.statusElement.style.backgroundColor = color;
            user.statusElement.style.color = '#ffffff';
        }
        
        if (user.statusDot) {
            user.statusDot.style.backgroundColor = color;
            user.statusDot.style.background = color;
            user.statusDot.classList.add(`status-${status}`);
        }
    }

    getStatusColor(status) {
        const colorMap = {
            'online': '#22c55e',
            'idle': '#eab308',
            'dnd': '#eab308',
            'offline': '#ef4444'
        };
        return colorMap[status] || '#6b7280';
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

    formatActivity(activity) {
        if (!activity) return null;
        
        if (activity.type === 0) {
            return `Playing: ${activity.name}`;
        } else if (activity.type === 2) {
            const song = activity.details || activity.name;
            const artist = activity.state || '';
            
            if (artist) {
                return `Listening to ${song} by ${artist}`;
            } else {
                return `Listening to ${song}`;
            }
        } else if (activity.type === 4) {
            return activity.state || activity.name || null;
        } else if (activity.type === 1) {
            return `Streaming: ${activity.name}`;
        } else if (activity.type === 3) {
            return `Watching: ${activity.name}`;
        } else if (activity.name) {
            return activity.name;
        }
        
        return null;
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.USERS_CONFIG && window.USERS_CONFIG.length > 0) {
            new MultiUserDiscordStatus(window.USERS_CONFIG);
        }
    });
} else {
    if (window.USERS_CONFIG && window.USERS_CONFIG.length > 0) {
        new MultiUserDiscordStatus(window.USERS_CONFIG);
    }
}

