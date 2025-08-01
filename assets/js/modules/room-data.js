/**
 * Room Data Module - ES6 Module
 */

const roomsConfig = {
    regular: {
        title: 'Regular Room',
        type: 'regular',
        price: 999,
        currency: '₱',
        period: '24 hours',
        capacity: 2,
        status: 'available',
        description: 'Comfortable and affordable accommodation perfect for budget-conscious travelers.',
        image: '../assets/images/family/family-1.webp',
        size: '20m²',
        checkIn: 'From 12:00 PM',
        checkOut: 'Until 12:00 PM',
        features: [
            { icon: 'fas fa-bed', text: 'Double bed' },
            { icon: 'fas fa-tv', text: '28" LED TV' },
            { icon: 'fas fa-wifi', text: 'Free WiFi' },
            { icon: 'fas fa-shower', text: 'Private bathroom' },
            { icon: 'fas fa-snowflake', text: 'Air conditioning' },
            { icon: 'fas fa-parking', text: 'Free parking' }
        ]
    },
    deluxe: {
        title: 'Deluxe Room',
        type: 'deluxe',
        price: 1999,
        currency: '₱',
        period: '24 hours',
        capacity: 3,
        status: 'available',
        description: 'Experience comfort in our well-appointed Deluxe Room with modern amenities.',
        image: '../assets/images/deluxe/deluxe-1.jpg',
        size: '24m²',
        checkIn: 'From 12:00 PM',
        checkOut: 'Until 12:00 PM',
        features: [
            { icon: 'fas fa-bed', text: 'Queen-size bed' },
            { icon: 'fas fa-tv', text: '32" LED TV' },
            { icon: 'fas fa-wifi', text: 'High-speed WiFi' },
            { icon: 'fas fa-shower', text: 'Hot & cold shower' },
            { icon: 'fas fa-snowflake', text: 'Air conditioning' },
            { icon: 'fas fa-coffee', text: 'Coffee facilities' }
        ]
    },
    executive: {
        title: 'Executive Suite',
        type: 'executive',
        price: 2999,
        currency: '₱',
        period: '24 hours',
        capacity: 4,
        status: 'available',
        description: 'Indulge in luxury with our Executive Suite for discerning travelers.',
        image: '../assets/images/executive/executive-1.jpg',
        size: '35m²',
        checkIn: 'From 12:00 PM',
        checkOut: 'Until 12:00 PM',
        features: [
            { icon: 'fas fa-bed', text: 'King-size bed' },
            { icon: 'fas fa-tv', text: '43" Smart TV' },
            { icon: 'fas fa-wifi', text: 'Premium WiFi' },
            { icon: 'fas fa-bath', text: 'Luxury bathroom' },
            { icon: 'fas fa-snowflake', text: 'Climate control' },
            { icon: 'fas fa-concierge-bell', text: 'Room service' }
        ]
    }
};

// ES6 Module export
export const RoomData = {
    getRoomData: function (roomType) {
        return roomsConfig[roomType] || null;
    },

    getAllRooms: function () {
        return roomsConfig;
    },

    getFormattedPrice: function (roomType) {
        const room = roomsConfig[roomType];
        return room ? `${room.currency}${room.price.toLocaleString()}` : '';
    },

    getDownPayment: function (roomType) {
        const room = roomsConfig[roomType];
        return room ? room.price * 0.5 : 0;
    },

    isValidRoomType: function (roomType) {
        return roomsConfig.hasOwnProperty(roomType);
    }
};

// Also attach to window for backwards compatibility
window.RoomData = RoomData;

console.log('RoomData module loaded (ES6)');
