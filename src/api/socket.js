let io = null;

function initSocket(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*')
                : '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'], // Support both transports
    });

    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id);
        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
        });
    });

    return io;
}

function emitEvent(event, data) {
    if (io) {
        io.emit(event, data);
        console.log(`📡 Emitted event: ${event}`);
    }
}

module.exports = { initSocket, emitEvent };
