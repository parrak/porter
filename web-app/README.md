# Porter Travel - Custom Web App

A modern, AI-powered travel planning web application built with Next.js, React, and Tailwind CSS.

## 🚀 Features

- **AI Travel Planner**: Get personalized trip recommendations using OpenAI
- **Flight Search**: Integrated flight search with your existing Porter API
- **Chat Assistant**: Embedded chat interface for travel questions
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **No OAuth Popups**: Direct API calls without ChatGPT confirmation prompts

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **AI Integration**: OpenAI GPT-4 for trip planning
- **State Management**: React Hooks, Zustand
- **Icons**: Lucide React
- **Forms**: React Hook Form

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file with:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_API_BASE_URL=https://porter-preview.vercel.app
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Components
- **TravelPlanner**: AI-powered trip planning interface
- **FlightSearch**: Flight search with your existing API
- **ChatWidget**: Embedded chat for travel assistance

### API Routes
- **`/api/plan-trip`**: OpenAI-powered trip planning
- **`/api/search-flights`**: Proxies to your existing flight API
- **`/api/chatgpt`**: Proxies to your existing chat API

### Key Benefits Over ChatGPT Actions
- ✅ **No OAuth confirmation popups**
- ✅ **Persistent user sessions**
- ✅ **Better UX and control**
- ✅ **Direct API integration**
- ✅ **Custom branding and design**

## 🔄 Hybrid Approach

This web app works alongside your existing ChatGPT Actions:

1. **ChatGPT Actions**: For discovery and initial engagement
2. **Web App**: For detailed planning and booking
3. **Deep Linking**: Seamlessly connect both experiences

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
- **Netlify**: `npm run build && netlify deploy`
- **Railway**: Connect your GitHub repo
- **Render**: Set build command to `npm run build`

## 📱 Mobile App Future

This web app is designed to be easily adapted for mobile:
- **React Native**: Share business logic
- **Expo**: Quick mobile development
- **PWA**: Progressive Web App capabilities

## 🔧 Customization

### Styling
- Modify `tailwind.config.js` for theme changes
- Update `globals.css` for custom styles
- Use Tailwind utility classes throughout

### AI Prompts
- Edit system prompts in API routes
- Adjust temperature and token limits
- Add custom validation rules

### API Integration
- Modify API endpoints in components
- Add authentication middleware
- Implement rate limiting

## 📊 Analytics & Monitoring

Add your preferred tools:
- **Google Analytics**: Set `NEXT_PUBLIC_GA_ID`
- **Sentry**: Set `NEXT_PUBLIC_SENTRY_DSN`
- **Custom**: Implement in `_app.tsx`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the existing Porter API documentation
2. Review OpenAI API documentation
3. Open an issue in this repository

---

**Built with ❤️ for better travel experiences**
