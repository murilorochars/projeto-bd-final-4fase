import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'smartech',
    user: 'postgres',
    password: 'root123'
});

export async function ping() {
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            console.log('PostgreSQL conectado! Pong!');
        } finally {
            client.release();
        }
    } catch (err) {
        console.log('Erro na conexão:', err.message);
    }
}
export default pool;