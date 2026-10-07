import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#0B0B0C', color: '#F3F2ED', padding: '58px 70px', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>GAME<span style={{ color: '#F38F2F' }}>ON</span></div><div style={{ display: 'flex', color: '#F38F2F', fontSize: 23 }}>18 OCTOBER 2026 / SUNDAY</div></div>
    <div style={{ display: 'flex', flexDirection: 'column', fontWeight: 800, fontSize: 100, letterSpacing: '-5px', lineHeight: 1.05 }}><div>YOUR SUNDAY.</div><div style={{ color: '#F38F2F' }}>ON US.</div></div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ fontSize: 24 }}>Cricket · Football · Badminton · Pickleball</div><div style={{ marginTop: 15, color: '#C9C8C4', fontSize: 21 }}>Sector 70, Gurugram · Evening DJ, pizza & coffee parties</div></div><div style={{ background: '#F38F2F', color: '#0B0B0C', borderRadius: 20, padding: '24px', fontSize: 25, fontWeight: 700 }}>FREE OPEN PLAY</div></div>
  </div>, { width: 1200, height: 630 });
}