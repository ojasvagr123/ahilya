import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

// Can be overridden at build time:
// flutter run -d chrome --dart-define=API_BASE=http://127.0.0.1:8000
// flutter run -d emulator-5554 --dart-define=API_BASE=http://10.0.2.2:8000
const _OVERRIDE = String.fromEnvironment('API_BASE', defaultValue: '');

String getApiBase() {
  if (_OVERRIDE.isNotEmpty) return _OVERRIDE;

  // Default dev targets:
  // - Web on same machine → 127.0.0.1:8000
  // - Android emulator → 10.0.2.2:8000
  // If you run on a real phone, override with your LAN IP via --dart-define.
  return kIsWeb ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000';
}

class Api {
  final String base = getApiBase();

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body,
      {Map<String, String>? headers}) async {
    try {
      final resp = await http
          .post(
        Uri.parse('$base$path'),
        headers: {
          'Content-Type': 'application/json',
          ...?headers,
        },
        body: jsonEncode(body),
      )
          .timeout(const Duration(seconds: 12));
      if (resp.statusCode != 200) {
        throw 'HTTP ${resp.statusCode}: ${resp.body}';
      }
      return jsonDecode(resp.body) as Map<String, dynamic>;
    } on Exception catch (e) {
      // Network/CORS/timeouts end up here
      throw 'Network error calling $path via $base: $e';
    }
  }

  Future<Map<String, dynamic>> login(String phone, String password) {
    return _post('/auth/login', {'phone': phone, 'password': password});
  }
  Future<Map<String, dynamic>> register(String name, String phone, String password) {
    return _post('/auth/register', {'name': name, 'phone': phone, 'password': password});
  }

  Future<Map<String, dynamic>> createReport({
    required String token,
    required String type, // 'sms' | 'url' | 'voip'
    required Map<String, dynamic> payload,
    required double lat,
    required double lon,
    required String area,
  }) {
    return _post(
      '/reports',
      {
        'type': type,
        'payload': payload,
        'lat': lat,
        'lon': lon,
        'area': area,
      },
      headers: {'Authorization': 'Bearer $token'},
    );
  }
}
