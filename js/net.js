// Network module for TÂB online gameplay
// Server: http://twserver.alunos.dcc.fc.up.pt:8008

const NET_BASE_URL = 'http://twserver.alunos.dcc.fc.up.pt:8008';

class NetworkClient {
    constructor() {
        this.eventSource = null;
        this.gameId = null;
        this.nick = null;
        this.password = null;
        this.group = null;
    }

    // Register a new user
    async register(nick, password) {
        try {
            const url = `${NET_BASE_URL}/register?nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            this.nick = nick;
            this.password = password;

            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Join a game
    async join(group, nick, password, size) {
        try {
            const url = `${NET_BASE_URL}/join?group=${encodeURIComponent(group)}&nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}&size=${size}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            this.gameId = data.game;
            this.group = group;
            this.nick = nick;
            this.password = password;

            return { 
                success: true, 
                gameId: data.game,
                data: data 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Leave current game
    async leave(nick, password, game) {
        try {
            const url = `${NET_BASE_URL}/leave?nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}&game=${encodeURIComponent(game)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            this.closeSSE();
            this.gameId = null;

            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Roll dice
    async roll(nick, password, game) {
        try {
            const url = `${NET_BASE_URL}/roll?nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}&game=${encodeURIComponent(game)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            return { 
                success: true, 
                roll: data.roll,
                data: data 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Pass turn
    async pass(nick, password, game) {
        try {
            const url = `${NET_BASE_URL}/pass?nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}&game=${encodeURIComponent(game)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Notify move
    async notify(nick, password, game, move) {
        try {
            const url = `${NET_BASE_URL}/notify?nick=${encodeURIComponent(nick)}&password=${encodeURIComponent(password)}&game=${encodeURIComponent(game)}&move=${encodeURIComponent(JSON.stringify(move))}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get ranking
    async ranking(group, size) {
        try {
            const url = `${NET_BASE_URL}/ranking?group=${encodeURIComponent(group)}&size=${size}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            return { 
                success: true, 
                ranking: data.ranking || [],
                data: data 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Subscribe to game updates via SSE
    subscribeToUpdates(game, onUpdate, onError) {
        this.closeSSE();

        try {
            const url = `${NET_BASE_URL}/update?nick=${encodeURIComponent(this.nick)}&game=${encodeURIComponent(game)}`;
            this.eventSource = new EventSource(url);

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (onUpdate) {
                        onUpdate(data);
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                    if (onError) {
                        onError(error);
                    }
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                if (onError) {
                    onError(error);
                }
            };

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    closeSSE() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    isConnected() {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }

    disconnect() {
        this.closeSSE();
        this.gameId = null;
    }
}
