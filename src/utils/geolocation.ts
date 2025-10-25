
export interface GeoLocationData {
    country: string;
    currency: string;
    currency_symbol: string;
  }
  
  export const getGeoLocationData = async (): Promise<GeoLocationData | null> => {
    try {
      // First get user's IP address
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
  
      const geoResponse = await fetch(
        `https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.NEXT_PUBLIC_IPGEOLOCATION_API_KEY}&ip=${ip}`
      );
      const data = await geoResponse.json();
  
      return {
        country: data.country_name,
        currency: data.currency?.code || 'NGN',
        currency_symbol: data.currency?.symbol || '₦'
      };
    } catch (error) {
      console.error('GEOLOCATION ERROR:', error);
      return null;
    }
  };