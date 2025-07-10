# Chrono Tracker

Chrono Tracker is a modern productivity and study app built with Expo React Native. It helps users manage tasks, plan study sessions, analyze productivity, and collaborate in real-time study rooms. The app features a beautiful, soothing UI and supports both local and collaborative (Supabase) workflows.

## Features
- **Authentication:** Secure login/register with Supabase (email/password)
- **Guest Mode:** Use the app without an account (local-only features)
- **Task Planner:** Create, edit, and group tasks by category and priority
- **Pomodoro Timer:** Focus timer with customizable durations and break times
- **Event Calendar:** Schedule and view events with color-coded status
- **Analysis:** Visualize productivity stats and trends
- **Study Rooms:** Create or join collaborative rooms for real-time group study
- **Shared Timer:** All room members see and control the same timer
- **Real-Time Notifications:** Reminders for tasks and events
- **Modern UI:** Light, clean, and accessible design

## Main Screens
- **LoginScreen:** User authentication
- **HomeScreen:** Dashboard and quick stats
- **PlannerScreen:** Task management and grouping
- **TimerScreen:** Pomodoro and custom timers with focus input
- **EventScreen:** Calendar and event scheduling
- **AnalysisScreen:** Productivity analytics and charts
- **RoomScreen:** Collaborative study room with shared timer and group notes
- **JoinRoomScreen / CreateRoomScreen:** Room management
- **SettingsScreen / MoreScreen:** App settings and extra features

## Technologies Used
- **React Native** (Expo managed workflow)
- **Supabase** (auth, real-time, collaborative features)
- **AsyncStorage** (local data)
- **React Navigation** (navigation)
- **React Native Paper** (UI components)
- **Expo Notifications** (reminders)

## Setup & Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/Anuj1820Dixit/Chrono-Tracker.git
   cd Chrono-Tracker
   ```
2. **Install dependencies:**
   ```sh
   yarn install
   # or
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env.local` file if needed for Supabase keys (see `src/lib/supabase.js`).
4. **Start the app:**
   ```sh
   yarn start
   # or
   npm start
   ```
   - Use Expo Go on your device, or run on an emulator with `yarn android` or `yarn ios`.

## Building for Production
- To build an Android App Bundle (AAB) for Play Store:
  ```sh
  eas build -p android --profile production
  ```
- Make sure your `app.json` references only your custom icon in `assets/icon.png`.

## Screenshots


## License
MIT
