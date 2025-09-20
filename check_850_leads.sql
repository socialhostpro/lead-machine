-- Query to find leads with 850 area code and check their location data
SELECT 
    id, 
    first_name, 
    last_name, 
    phone,
    caller_latitude,
    caller_longitude,
    CASE 
        WHEN phone LIKE '%850%' THEN 'Tallahassee, FL'
        ELSE 'Unknown'
    END as correct_location
FROM leads 
WHERE phone LIKE '%850%'
ORDER BY created_at DESC
LIMIT 20;