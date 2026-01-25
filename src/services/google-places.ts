/**
 * Google Places API Service
 * Fetches place details from Google Maps URL or Place ID
 */

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalReviews?: number;
  types?: string[];
  latitude?: number;
  longitude?: number;
  businessStatus?: string;
  openingHours?: string[];
  photoUrl?: string;
}

/**
 * Extract Place ID from various Google Maps URL formats
 * Supports:
 * - https://maps.google.com/?cid=XXXXX
 * - https://www.google.com/maps/place/.../@lat,lng,zoom/data=...!1s0x...:0x...
 * - https://goo.gl/maps/XXXXX (short URLs)
 * - https://maps.app.goo.gl/XXXXX
 * - Direct Place ID (ChIJ...)
 */
export function extractPlaceIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  
  // Direct Place ID format (starts with ChIJ)
  if (trimmed.startsWith('ChIJ')) {
    return trimmed;
  }

  // CID format: ?cid=XXXXX
  const cidMatch = trimmed.match(/[?&]cid=(\d+)/);
  if (cidMatch) {
    return `cid:${cidMatch[1]}`;
  }

  // Place ID in URL: place_id=XXXXX or !1s(PLACE_ID)
  const placeIdMatch = trimmed.match(/place_id=([^&]+)/);
  if (placeIdMatch) {
    return decodeURIComponent(placeIdMatch[1]);
  }

  // Data format: !1s0x...:0x... (hex format)
  const hexMatch = trimmed.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i);
  if (hexMatch) {
    return hexMatch[1];
  }

  // FTid format in data parameter
  const ftidMatch = trimmed.match(/ftid=([^&]+)/);
  if (ftidMatch) {
    return decodeURIComponent(ftidMatch[1]);
  }

  // If it's a short URL, we need to expand it first (handled separately)
  if (trimmed.includes('goo.gl/maps') || trimmed.includes('maps.app.goo.gl')) {
    return `short:${trimmed}`;
  }

  // Extract from /place/ URL - the place name after /place/
  const placeNameMatch = trimmed.match(/\/place\/([^/@]+)/);
  if (placeNameMatch) {
    return `search:${decodeURIComponent(placeNameMatch[1])}`;
  }

  return null;
}

/**
 * Expand short Google Maps URL to get the full URL
 */
export async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });
    return response.url;
  } catch (error) {
    console.error('Error expanding short URL:', error);
    throw new Error('Failed to expand short URL');
  }
}

/**
 * Fetch place details from Google Places API
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_BUSINESS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  // Handle different ID formats
  let actualPlaceId = placeId;
  
  // If it's a short URL, expand it first
  if (placeId.startsWith('short:')) {
    const shortUrl = placeId.replace('short:', '');
    const expandedUrl = await expandShortUrl(shortUrl);
    const extractedId = extractPlaceIdFromUrl(expandedUrl);
    if (!extractedId || extractedId.startsWith('short:')) {
      throw new Error('Could not extract Place ID from short URL');
    }
    actualPlaceId = extractedId;
  }

  // If it's a search query, use Find Place API
  if (actualPlaceId.startsWith('search:')) {
    const searchQuery = actualPlaceId.replace('search:', '');
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    
    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    if (findData.candidates && findData.candidates.length > 0) {
      actualPlaceId = findData.candidates[0].place_id;
    } else {
      throw new Error('Place not found');
    }
  }

  // If it's a CID, convert to Place ID
  if (actualPlaceId.startsWith('cid:')) {
    // CID lookup requires a different approach - use geocoding
    const cid = actualPlaceId.replace('cid:', '');
    // For CID, we'll use the find place API with the CID
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=place_id&key=${apiKey}`;
    
    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    if (findData.result?.place_id) {
      actualPlaceId = findData.result.place_id;
    }
  }

  // Fetch place details
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'types',
    'geometry',
    'business_status',
    'opening_hours',
    'photos',
  ].join(',');

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${actualPlaceId}&fields=${fields}&key=${apiKey}`;
  
  const response = await fetch(detailsUrl);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const place = data.result;

  // Get photo URL if available
  let photoUrl: string | undefined;
  if (place.photos && place.photos.length > 0) {
    const photoRef = place.photos[0].photo_reference;
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`;
  }

  return {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    phone: place.formatted_phone_number || place.international_phone_number,
    website: place.website,
    rating: place.rating,
    totalReviews: place.user_ratings_total,
    types: place.types,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    businessStatus: place.business_status,
    openingHours: place.opening_hours?.weekday_text,
    photoUrl,
  };
}

/**
 * Main function to get place details from any Google Maps input
 */
export async function getPlaceDetailsFromInput(input: string): Promise<PlaceDetails> {
  const extractedId = extractPlaceIdFromUrl(input);
  
  if (!extractedId) {
    // Try as a direct search query
    return fetchPlaceDetails(`search:${input}`);
  }
  
  return fetchPlaceDetails(extractedId);
}

/**
 * Review from Google Places API
 */
export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  profilePhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  time: number; // Unix timestamp
}

/**
 * Fetch reviews for a place using Google Places API
 * Note: Places API returns up to 5 most relevant reviews
 */
export async function fetchPlaceReviews(placeId: string): Promise<{
  reviews: PlaceReview[];
  placeDetails: { name: string; rating?: number; totalReviews?: number };
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_BUSINESS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  // Handle different ID formats (same logic as fetchPlaceDetails)
  let actualPlaceId = placeId;
  
  if (placeId.startsWith('short:')) {
    const shortUrl = placeId.replace('short:', '');
    const expandedUrl = await expandShortUrl(shortUrl);
    const extractedId = extractPlaceIdFromUrl(expandedUrl);
    if (!extractedId || extractedId.startsWith('short:')) {
      throw new Error('Could not extract Place ID from short URL');
    }
    actualPlaceId = extractedId;
  }

  if (actualPlaceId.startsWith('search:')) {
    const searchQuery = actualPlaceId.replace('search:', '');
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    
    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    if (findData.candidates && findData.candidates.length > 0) {
      actualPlaceId = findData.candidates[0].place_id;
    } else {
      throw new Error('Place not found');
    }
  }

  if (actualPlaceId.startsWith('cid:')) {
    const cid = actualPlaceId.replace('cid:', '');
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=place_id&key=${apiKey}`;
    
    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    if (findData.result?.place_id) {
      actualPlaceId = findData.result.place_id;
    }
  }

  // Fetch place details with reviews
  const fields = [
    'place_id',
    'name',
    'rating',
    'user_ratings_total',
    'reviews',
  ].join(',');

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${actualPlaceId}&fields=${fields}&reviews_sort=newest&key=${apiKey}`;
  
  const response = await fetch(detailsUrl);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const place = data.result;
  const reviews: PlaceReview[] = (place.reviews || []).map((r: {
    author_name: string;
    author_url?: string;
    profile_photo_url?: string;
    rating: number;
    text: string;
    relative_time_description: string;
    time: number;
  }) => ({
    authorName: r.author_name,
    authorUrl: r.author_url,
    profilePhotoUrl: r.profile_photo_url,
    rating: r.rating,
    text: r.text || '',
    relativeTimeDescription: r.relative_time_description,
    time: r.time,
  }));

  return {
    reviews,
    placeDetails: {
      name: place.name,
      rating: place.rating,
      totalReviews: place.user_ratings_total,
    },
  };
}
