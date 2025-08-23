import 'package:flutter/material.dart';
import '../theme.dart';
import 'login_page.dart';
import 'register_page.dart';
import 'home_page.dart';

class LandingPage extends StatelessWidget {
  final VoidCallback? onLogin;
  final VoidCallback? onRegister;
  const LandingPage({super.key, this.onLogin, this.onRegister});
  void _goLogin(BuildContext context) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => LoginPage(
          onAuthed: (token) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Signed in')),
            );
            Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (_) => HomePage(
                  token: token,
                  onLogout: () => Navigator.of(context, rootNavigator: true)
                      .pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LandingPage()),
                        (route) => false,
                  ),
                ),
              ),
                  (route) => false,
            );
          },
        ),
      ),
    );
  }

  void _goRegister(BuildContext context) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => RegisterPage(
          onAuthed: (token) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Registration completed successfully')),
            );
            Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (_) => HomePage(
                  token: token,
                  onLogout: () => Navigator.of(context, rootNavigator: true)
                      .pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LandingPage()),
                        (route) => false,
                  ),
                ),
              ),
                  (route) => false,
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [brandCream, Color(0xFFFFE0B2)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                elevation: 6,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(
                        radius: 56,
                        backgroundColor: brandOrange.withOpacity(.15),
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Image.asset('assets/images/logo2.png', fit: BoxFit.contain),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Ahilya RakshaSutra \n   अहिल्या रक्षा सूत्र',
                        style: TextStyle(fontSize: 24,fontFamily: 'Noto_Sans_Devenagri', fontWeight: FontWeight.w700, color: brandBrown),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Report suspicious SMS, calls, and URLs.\nProtect your community.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: brandBrown),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _goLogin(context),
                          child: const Text('Login | लॉगिन'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: brandOrange,
                            side: const BorderSide(color: brandOrange, width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _goRegister(context),
                            child: const Text('Create account | खाता बनाएं'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
