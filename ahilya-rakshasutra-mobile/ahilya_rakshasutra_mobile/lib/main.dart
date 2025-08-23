import 'package:flutter/material.dart';
import 'theme.dart';
import 'pages/landing_page.dart';
import 'pages/login_page.dart';      // keep if LandingPage uses them internally
import 'pages/register_page.dart';   // keep if LandingPage uses them internally
import 'pages/home_page.dart';

void main() => runApp(const App());

class App extends StatefulWidget {
  const App({super.key});
  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  // Use a global key so we never rely on a stale BuildContext.
  final GlobalKey<NavigatorState> _navKey = GlobalKey<NavigatorState>();

  String? token;

  void _onAuthed(String t) => setState(() => token = t);

  void _logout() {
    // clear your app state
    setState(() => token = null);

    // reset the navigation stack to LandingPage safely
    _navKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LandingPage()),
          (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ahilya RakshaSutra',
      theme: appTheme,
      navigatorKey: _navKey,
      // We still gate the initial screen by token,
      // but logout always hard-resets the stack via navigatorKey.
      home: token == null
          ? const LandingPage()
          : HomePage(token: token!, onLogout: _logout),
    );
  }
}
