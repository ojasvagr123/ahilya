import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

import 'package:http/http.dart' as http;

const _OVERRIDE = String.fromEnvironment('API_BASE', defaultValue: '');

String getApiBase() {
  if (_OVERRIDE.isNotEmpty) return _OVERRIDE;
  return "http://10.235.220.67:8000"; // <-- replace with your IP
}

class Api {
  final String base = getApiBase();

  // ---- Upload Report (Image / App with file) ----
  Future<Map<String, dynamic>> uploadReport({
    required String token,
    required String type, // "image" or "app"
    File? file,
    Uint8List? fileBytes,
    required double lat,
    required double lon,
    required String area,
  }) async {
    final uri = Uri.parse('$base/reports');
    final request = http.MultipartRequest("POST", uri);

    request.headers['Authorization'] = 'Bearer $token';
    request.fields['type'] = type;
    request.fields['lat'] = lat.toString();
    request.fields['lon'] = lon.toString();
    request.fields['area'] = area;

    if (file != null) {
      request.files.add(await http.MultipartFile.fromPath('file', file.path));
    } else if (fileBytes != null) {
      request.files.add(http.MultipartFile.fromBytes("file", fileBytes, filename: "upload.bin"));
    }

    final resp = await request.send();
    final body = await resp.stream.bytesToString();

    if (resp.statusCode != 200) {
      throw 'HTTP ${resp.statusCode}: $body';
    }
    return jsonDecode(body) as Map<String, dynamic>;
  }

  // ---- Generic POST ----
  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body, {Map<String, String>? headers}) async {
    final resp = await http.post(
      Uri.parse('$base$path'),
      headers: {'Content-Type': 'application/json', ...?headers},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 12));

    if (resp.statusCode != 200) throw 'HTTP ${resp.statusCode}: ${resp.body}';
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  // ---- Auth APIs ----
  Future<Map<String, dynamic>> login(String phone, String password) {
    return _post('/auth/login', {'phone': phone, 'password': password});
  }

  Future<Map<String, dynamic>> register(String name, String phone, String password) {
    return _post('/auth/register', {'name': name, 'phone': phone, 'password': password});
  }

  // ---- Reports API ----
  Future<Map<String, dynamic>> createReport({
    required String token,
    required String type,
    required Map<String, dynamic> payload,
    required double lat,
    required double lon,
    required String area,
  }) {
    return _post('/reports', {
      'type': type,
      'payload': payload,
      'lat': lat,
      'lon': lon,
      'area': area,
    }, headers: {'Authorization': 'Bearer $token'});
  }
}
