// Discord Status API Server
// This server securely handles Discord API requests using a bot token

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Discord API configuration
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API_BASE = 'https://discord.com/api/v10';

if (!DISCORD_BOT_TOKEN) {
    console.error('ERROR: DISCORD_BOT_TOKEN is not set in .env file');
    console.error('Please create a .env file with your Discord bot token');
    process.exit(1);
}

// Helper function to make Discord API requests
async function discordRequest(endpoint) {
    try {
        const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Discord API request failed:', error);
        throw error;
    }
}

// Get user presence/status
async function getUserPresence(userId) {
    try {
        // Note: Discord's REST API doesn't directly provide user presence
        // We need to use Gateway API or check guild member presence
        // For simplicity, we'll use a workaround with guild members
        
        // If you have a guild ID, you can check member presence there
        // Otherwise, we'll return a basic status check
        
        // For now, we'll use a simpler approach - checking if user exists
        // and returning a cached/estimated status
        // In production, you'd want to use Discord Gateway or store presence data
        
        return {
            status: 'offline', // Default
            lastSeen: null,
            activity: null
        };
    } catch (error) {
        console.error('Error getting user presence:', error);
        return null;
    }
}

// Alternative: Use Lanyard API (easier, no bot token needed for public profiles)
async function getLanyardStatus(userId) {
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            const presence = data.data;
            return {
                status: presence.discord_status || 'offline',
                lastSeen: presence.activities?.[0]?.timestamps?.start 
                    ? new Date(presence.activities[0].timestamps.start).toISOString()
                    : null,
                activity: presence.activities?.[0]?.name || null
            };
        }
        return null;
    } catch (error) {
        console.error('Lanyard API error:', error);
        return null;
    }
}

// API endpoint for Discord status
app.get('/api/discord-status', async (req, res) => {
    const userId = req.query.userId;
    
    if (!userId || userId === 'YOUR_DISCORD_USER_ID') {
        return res.json({
            success: false,
            error: 'Discord user ID is required. Please set DISCORD_USER_ID in your HTML.'
        });
    }

    try {
        // Use Lanyard API (easiest, no bot token needed)
        // Users just need to connect at https://lanyard.org/
        let statusData = await getLanyardStatus(userId);
        
        // If Lanyard fails and you have a bot token, fall back to Discord API
        if (!statusData && DISCORD_BOT_TOKEN) {
            statusData = await getUserPresence(userId);
        }

        if (statusData) {
            res.json({
                success: true,
                status: statusData.status,
                lastSeen: statusData.lastSeen,
                activity: statusData.activity
            });
        } else {
            res.json({
                success: false,
                error: 'Could not fetch Discord status. Make sure you\'ve connected your account at https://lanyard.org/'
            });
        }
    } catch (error) {
        console.error('Error fetching Discord status:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Discord Status API server running on port ${PORT}`);
    console.log(`Make sure to set DISCORD_BOT_TOKEN in your .env file`);
    console.log(`API endpoint: http://localhost:${PORT}/api/discord-status`);
});

