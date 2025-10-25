export interface TicketType {
    name: string;
    sold: string;
    price: string;
    quantity: string;
  }
  
  export interface Event {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string;
    date: string;
    location: string;
    ticketType: TicketType[];
  }
  
  export interface Attendee {
    name: string;
    email: string;
  }
  
  export interface Ticket {
    id: string;
    eventId: string;
    email: string;
    phone: string;
    fullName: string;
    ticketType: string;
    price: number;
    purchaseDate: string;
    qrCode: string;
    paid: boolean;
    currency: string;
    flwRef: string;
    attendees: Attendee[];
    validationStatus: string;
    isScanned: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface TicketStats {
    totalSold: number;
    revenue: number;
    soldByType: Record<string, number>;
  }
  
  export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor: string[];
  }
  
  export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
  }