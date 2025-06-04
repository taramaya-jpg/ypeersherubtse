const db = require('../config/db');

// Create events table if it doesn't exist
const createEventTable = async () => {
    try {
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'events'
            )
        `;
        const tableExists = await db.one(checkTableQuery);

        if (!tableExists.exists) {
            const createQuery = `
                CREATE TABLE events (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    image_url VARCHAR(255),
                    event_date TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            await db.none(createQuery);
            console.log('✅ Events table created successfully');
        } else {
            console.log('✅ Events table already exists');
        }
    } catch (error) {
        console.error('❌ Error checking/creating events table:', error);
        throw error;
    }
};

// Add new event
const addEvent = async (eventData) => {
    try {
        const { title, description, event_date, image_url } = eventData;
        const query = 'INSERT INTO events (title, description, event_date, image_url) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [title, description, event_date, image_url];

        const result = await db.one(query, values);
        return result;
    } catch (error) {
        console.error('Error adding event:', error);
        throw error;
    }
};

// Get all events
const getAllEvents = async () => {
    try {
        const query = 'SELECT * FROM events ORDER BY event_date DESC';
        const result = await db.any(query);
        return result;
    } catch (error) {
        console.error('Error getting all events:', error);
        throw error;
    }
};

// Get upcoming events
const getUpcomingEvents = async () => {
    try {
        const query = 'SELECT * FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC';
        const result = await db.any(query);
        return result;
    } catch (error) {
        console.error('Error getting upcoming events:', error);
        throw error;
    }
};

// Get past events
const getPastEvents = async () => {
    try {
        const query = 'SELECT * FROM events WHERE event_date < CURRENT_DATE ORDER BY event_date DESC';
        const result = await db.any(query);
        return result;
    } catch (error) {
        console.error('Error getting past events:', error);
        throw error;
    }
};

// Get event by ID
const getEventById = async (id) => {
    try {
        const query = 'SELECT * FROM events WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error getting event by ID:', error);
        throw error;
    }
};

// Update event
const updateEvent = async (id, eventData) => {
    try {
        const { title, description, event_date, image_url } = eventData;
        const query = `
            UPDATE events 
            SET title = $1, description = $2, event_date = $3, image_url = $4
            WHERE id = $5
            RETURNING *
        `;
        const values = [title, description, event_date, image_url, id];

        const result = await db.one(query, values);
        return result;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

// Delete event
const deleteEvent = async (id) => {
    try {
        const query = 'DELETE FROM events WHERE id = $1';
        await db.query(query, [id]);
        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};

module.exports = {
    createEventTable,
    addEvent,
    getAllEvents,
    getUpcomingEvents,
    getPastEvents,
    getEventById,
    updateEvent,
    deleteEvent
};