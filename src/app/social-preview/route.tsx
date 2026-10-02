import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0B0B0C', color: '#F7F5F2', padding: '80px' }}>
      <div style={{ display: 'flex', fontSize: 92, fontWeight: 700 }}>GAME<span style={{ color: '#F38F2F' }}>ON</span></div>
      <div style={{ fontSize: 38, marginTop: 24 }}>One address. Every sport.</div>
      <div style={{ fontSize: 26, color: '#F38F2F', marginTop: 32 }}>Badminton · Pickleball · Box Cricket · Football</div>
      <div style={{ fontSize: 24, marginTop: 32 }}>Sector 70, Gurugram</div>
    </div>, { width: 1200, height: 630 },
  );
}