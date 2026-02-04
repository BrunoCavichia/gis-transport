// scripts/test-zones-api.ts
async function test() {
  const url = 'http://localhost:3005/api/zones?lat=40.4168&lon=-3.7038&radius=25000&limit=10';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Error status:', res.status);
      const text = await res.text();
      console.error('Response:', text);
      return;
    }
    const data: any = await res.json();
    console.log('Result zones:', data.zones?.length);
    if (data.zones && data.zones.length > 0) {
      const z = data.zones[0];
      console.log('First zone:', z.name);
      console.log('Coords type:', typeof z.coordinates);
      console.log('Coords length:', z.coordinates?.length);
      // Check nesting
      if (Array.isArray(z.coordinates)) {
        console.log('Nesting 1 (Points/Rings/Polys):', z.coordinates.length);
        if (Array.isArray(z.coordinates[0])) {
           console.log('Nesting 2:', z.coordinates[0].length);
           if (Array.isArray(z.coordinates[0][0])) {
             console.log('Nesting 3:', z.coordinates[0][0].length);
           }
        }
      }
    }
  } catch (err) {
    console.error('Fetch failed. Is the server running on port 3005?', err);
  }
}
test();
