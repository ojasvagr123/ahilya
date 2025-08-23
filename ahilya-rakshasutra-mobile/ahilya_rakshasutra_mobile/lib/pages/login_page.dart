import 'package:ahilya_rakshasutra_mobile/pages/register_page.dart';
import 'package:flutter/material.dart';
import '../api.dart';

class LoginPage extends StatefulWidget {
  final void Function(String token) onAuthed;
  const LoginPage({super.key, required this.onAuthed});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final phone = TextEditingController(text: '+91'); // normal user
  final pass = TextEditingController(text: '');
  bool busy = false;
  String? err;
  final api = Api();

  Future<void> _login() async {
    setState(() { busy = true; err = null; });
    try {
      final data = await api.login(phone.text.trim(), pass.text);
      final token = data['token']['access_token'] as String;
      widget.onAuthed(token);
    } catch (e) {
      setState(() => err = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login | लॉगिन')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            elevation: 6,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone | फोन (+91...)')),
                const SizedBox(height: 8),
                TextField(controller: pass, decoration: const InputDecoration(labelText: 'Password | पासवर्ड'), obscureText: true),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: busy ? null : _login, child: Text(busy ? 'Signing in...' : 'Sign in | प्रवेश करें')),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => RegisterPage(onAuthed: widget.onAuthed)),
                    );
                  },
                  child: const Text('Create a new account | नया खाता बनाएँ'),
                ),
                if (err != null)
                  Padding(padding: const EdgeInsets.only(top: 8), child: Text(err!, style: const TextStyle(color: Colors.red))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
