# Compliance Guard - AI-Powered Compliance Management Platform

Legacy prototype application preserved inside the monorepo at `apps/ai-complainec-legacy`.

A comprehensive cybersecurity compliance management platform designed for NCA (National Cybersecurity Authority) regulations in Saudi Arabia. This application provides AI-powered policy analysis, compliance assessments, gap analysis, remediation guidance, and comprehensive reporting.

## 🚀 Features

### Core Functionality
- **Dashboard**: Overview of compliance status, scores, and recent activity
- **Policy Management**: Upload and AI-analyze security policies against NCA frameworks
- **Compliance Assessments**: Create assessments against ECC, CSCC, DCC, OTCC, TCC frameworks
- **Gap Analysis**: Identify compliance gaps with AI-powered recommendations
- **Remediation Assistant**: AI-powered guidance for fixing compliance issues
- **Reports**: Generate executive summaries, detailed reports, and gap analysis reports
- **Scheduling**: Automated policy analysis on daily/weekly/monthly/quarterly basis
- **Team Collaboration**: Assign tasks, add comments, and manage teams
- **Audit Trail**: Complete audit logging for all compliance activities

### Technical Features
- Modern React + Vite architecture
- Responsive design with mobile support
- Real-time notifications
- Dark mode support
- Error boundaries and comprehensive error handling
- Optimized production builds

## 📋 Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd apps/ai-complainec-legacy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Note**: This is a standalone application that uses browser localStorage for data storage. No backend or external services are required!

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run typecheck` - Run TypeScript type checking

## 🏗️ Project Structure

```
├── src/
│   ├── api/              # API client configuration
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── policy/       # Policy management components
│   │   ├── assessment/   # Assessment components
│   │   ├── reports/      # Report generation components
│   │   ├── collaboration/# Collaboration features
│   │   └── audit/        # Audit trail components
│   ├── lib/              # Utility libraries
│   ├── pages/            # Page components
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main app component
│   ├── Layout.jsx        # Layout wrapper
│   └── main.jsx          # Entry point
├── public/               # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
```

## 🎨 Design System

The application uses a professional cybersecurity-themed design:
- **Primary Colors**: Deep navy (#0F172A), Electric blue (#3B82F6), Teal (#14B8A6)
- **Status Colors**: 
  - Green (#10B981) for compliance
  - Amber (#F59E0B) for warnings
  - Rose (#F43F5E) for violations
- **Typography**: Clean, modern sans-serif fonts
- **Components**: Built with Radix UI and Tailwind CSS

## 🔐 Authentication

The application uses a simple local authentication system. In standalone mode, users are automatically authenticated. The app uses browser localStorage to persist all data.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Production

You can deploy this standalone application to any static hosting service:

**Vercel:**
```bash
npm run build
vercel deploy
```

**Netlify:**
```bash
npm run build
# Upload the dist folder to Netlify
```

**GitHub Pages:**
```bash
npm run build
# Push dist folder to gh-pages branch
```

The app works entirely client-side using localStorage, so no backend is needed!

## 🐛 Troubleshooting

### Common Issues

**Issue**: App won't start
- **Solution**: Make sure Node.js 18+ is installed and run `npm install`

**Issue**: Data not persisting
- **Solution**: Check that localStorage is enabled in your browser. The app uses localStorage to store all data.

**Issue**: Build errors
- **Solution**: Run `npm install` again to ensure all dependencies are installed

**Issue**: Clearing all data
- **Solution**: Clear browser localStorage or use browser dev tools to remove `compliance_guard_*` keys

## 📚 Documentation

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)

## 💾 Data Storage

This application uses browser **localStorage** to store all data. This means:
- ✅ No backend required
- ✅ Works offline (after initial load)
- ✅ Data persists across sessions
- ⚠️ Data is browser-specific (not synced across devices)
- ⚠️ Clearing browser data will remove all stored information

To export/backup data, use browser dev tools to copy localStorage values with keys starting with `compliance_guard_`.

## 📄 License

This project is private and proprietary.

## 🔄 Version History

- **v1.0.0** - Initial release with core compliance features
- Enhanced policy analysis AI
- Assessment workflow improvements
- Audit trail integration
- Collaboration features
- Reporting module

---

**Built with ❤️ using React and Vite - Standalone Application**
