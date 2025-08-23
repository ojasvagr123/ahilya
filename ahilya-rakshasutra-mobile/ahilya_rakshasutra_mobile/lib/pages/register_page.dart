import 'package:flutter/material.dart';
import '../api.dart';

class RegisterPage extends StatefulWidget {
  final void Function(String token) onAuthed;
  const RegisterPage({super.key, required this.onAuthed});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final name = TextEditingController();
  final phone = TextEditingController(text: '+91');
  final pass  = TextEditingController();
  final pass2 = TextEditingController();

  final api = Api();
  bool busy = false;
  String? err;

  Future<void> _register() async {
    final n = name.text.trim();
    final p = phone.text.trim();
    final pw = pass.text;
    final pw2 = pass2.text;

    if (n.isEmpty || p.isEmpty || pw.isEmpty) {
      setState(() => err = 'All fields are required');
      return;
    }
    if (pw.length < 4) {
      setState(() => err = 'Password must be at least 4 characters');
      return;
    }
    if (pw != pw2) {
      setState(() => err = 'Passwords do not match');
      return;
    }

    setState(() { busy = true; err = null; });
    try {
      // requires Api.register(name, phone, password)
      final data = await api.register(n, p, pw);
      final token = data['token']['access_token'] as String;

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registration completed successfully')),
      );

      // hand token to parent (it will show HomePage)
      widget.onAuthed(token);

      // clear Register page (and Login) from stack to reveal the new Home
      await Future.delayed(const Duration(milliseconds: 200));
      if (mounted) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) setState(() => err = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    name.dispose(); phone.dispose(); pass.dispose(); pass2.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register | रजिस्टर')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            elevation: 6,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(controller: name,  decoration: const InputDecoration(labelText: 'Name | नाम')),
                  const SizedBox(height: 8),
                  TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone | फोन (+91...)')),
                  const SizedBox(height: 8),
                  TextField(controller: pass,  decoration: const InputDecoration(labelText: 'Password | पासवर्ड'), obscureText: true),
                  const SizedBox(height: 8),
                  TextField(controller: pass2, decoration: const InputDecoration(labelText: 'Confirm Password | पासवर्ड की पुष्टि करें'), obscureText: true),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: busy ? null : _register,
                      child: Text(busy ? 'Creating...' : 'Create account | खाता बनाएँ'),
                    ),
                  ),
                  if (err != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(err!, style: const TextStyle(color: Colors.red)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}