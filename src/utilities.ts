import { pool } from "./dbconnection"; 

import opencage from 'opencage-api-client';

interface coordinates {
    latitude: number;
    longitude: number;
}

export const getCoordinates = async (address: string):Promise<coordinates | null> => {
    const apiKey = 'a1536c7cd4644d9a925f4a01cebef8bf'; 
    const response = await opencage.geocode({ q: address, key: apiKey });
    
    if (response.results.length > 0) {
        const { lat, lng } = response.results[0].geometry;
        return { latitude: lat, longitude: lng };
    } else {
        throw new Error('No coordinates found');
    }
};

export const checkUser = async(userId:number): Promise<void> =>{
    const query = 'SELECT COUNT(*) FROM "users" WHERE "user_id" = $1';
    const result = await pool.query(query, [userId]);
    if(parseInt(result.rows[0].count) === 0){
        throw new Error('User not found')
    }
}