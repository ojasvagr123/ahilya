import 'package:flutter/material.dart';
import 'theme.dart';
import 'pages/landing_page.dart';
import 'pages/home_page.dart';

void main() => runApp(const App());

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  final GlobalKey<NavigatorState> _navKey = GlobalKey<NavigatorState>();
  String? token;

  void _onAuthed(String t) => setState(() => token = t);

  void _logout() {
    setState(() => token = null);

    // Reset navigation stack to LandingPage
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
      home: token == null
          ? const LandingPage()
          : HomePage(token: token!, onLogout: _logout),
    );
  }
}
