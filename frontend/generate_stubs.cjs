const fs = require('fs');
const path = require('path');

const dirs = [
  'src/layouts',
  'src/pages/public',
  'src/pages/authority'
];

dirs.forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

const files = {
  'src/layouts/PublicLayout.tsx': `import { Outlet } from "react-router-dom";\nexport default function PublicLayout() { return <div className="min-h-screen bg-background text-foreground"><Outlet /></div>; }`,
  'src/layouts/AuthorityLayout.tsx': `import { Outlet } from "react-router-dom";\nexport default function AuthorityLayout() { return <div className="min-h-screen flex bg-background text-foreground"><main className="flex-1 p-6"><Outlet /></main></div>; }`,
  'src/pages/public/Home.tsx': `export default function Home() { return <div>Home Page</div>; }`,
  'src/pages/public/About.tsx': `export default function About() { return <div>About</div>; }`,
  'src/pages/public/HowItWorks.tsx': `export default function HowItWorks() { return <div>How It Works</div>; }`,
  'src/pages/public/Safety.tsx': `export default function Safety() { return <div>Safety</div>; }`,
  'src/pages/public/Contact.tsx': `export default function Contact() { return <div>Contact</div>; }`,
  'src/pages/authority/Login.tsx': `export default function Login() { return <div>Login</div>; }`,
  'src/pages/authority/Dashboard.tsx': `export default function Dashboard() { return <div>Dashboard</div>; }`,
  'src/pages/authority/LiveDetection.tsx': `export default function LiveDetection() { return <div>Live Detection</div>; }`,
  'src/pages/authority/PhotoDetection.tsx': `export default function PhotoDetection() { return <div>Photo Detection</div>; }`,
  'src/pages/authority/VideoDetection.tsx': `export default function VideoDetection() { return <div>Video Detection</div>; }`,
  'src/pages/authority/Violations.tsx': `export default function Violations() { return <div>Violations</div>; }`,
  'src/pages/authority/MapView.tsx': `export default function MapView() { return <div>Map View</div>; }`,
  'src/pages/authority/Analytics.tsx': `export default function Analytics() { return <div>Analytics</div>; }`,
};

Object.entries(files).forEach(([file, content]) => {
  fs.writeFileSync(path.join(__dirname, file), content);
});

console.log("Stubs created.");
