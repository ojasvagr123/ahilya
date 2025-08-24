import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:ahilya_rakshasutra_mobile/pages/landing_page.dart';
import '../api.dart';

class HomePage extends StatefulWidget {
  final String token;
  final VoidCallback onLogout;
  const HomePage({super.key, required this.token, required this.onLogout});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage>
    with SingleTickerProviderStateMixin {
  late TabController tc;
  final api = Api();

  final areas = const [
    'Palasia | पलासिया',
    'Vijay Nagar | विजय नगर',
    'Rajwada | राजवाड़ा',
    'Indrapuri | इंद्रपुरी',
    'Bhawarkuan | भँवरकुआँ',
    'Sudama Nagar | सुदामा नगर',
  ];

  String area = 'Palasia | पलासिया';

  final Map<String, List<double>> areaCoords = const {
    'Palasia | पलासिया': [22.727269, 75.883894],
    'Vijay Nagar | विजय नगर': [22.7546, 75.8947],
    'Rajwada | राजवाड़ा': [22.718435, 75.855217],
    'Indrapuri | इंद्रपुरी': [22.684965, 75.871187],
    'Bhawarkuan | भँवरकुआँ': [22.719569, 75.857726],
    'Sudama Nagar | सुदामा नगर': [22.688833, 75.831141],
  };

  final smsText = TextEditingController();
  final urlText = TextEditingController();
  final phoneText = TextEditingController(text: '+91');

  // File upload variables
  File? selectedFile;
  Uint8List? selectedBytes;
  String? fileType; // 'image' or 'app'
  bool busy = false;
  String? last;

  @override
  void initState() {
    super.initState();
    tc = TabController(length: 4, vsync: this); // 4 tabs
  }

  Future<void> submit(String type) async {
    setState(() {
      busy = true;
      last = null;
    });
    final coords = areaCoords[area] ?? [22.7196, 75.8577];
    final payload = type == 'sms'
        ? {'text': smsText.text}
        : type == 'url'
        ? {'url': urlText.text}
        : {'phone': phoneText.text};

    try {
      final data = await api.createReport(
        token: widget.token,
        type: type,
        payload: payload,
        lat: coords[0],
        lon: coords[1],
        area: area,
      );
      setState(() => last = 'OK: ${data['id']} (${data['type']})');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Report submitted successfully | रिपोर्ट सफलतापूर्वक सबमिट हो गई'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() => last = 'ERR: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit | सबमिट नहीं हो पाया: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  /// -------- File Upload Functions ----------
  Future<void> pickImage() async {
    final picker = ImagePicker();
    final XFile? file = await picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      if (kIsWeb) {
        final bytes = await file.readAsBytes();
        setState(() {
          selectedBytes = bytes;
          selectedFile = null;
          fileType = 'image';
        });
      } else {
        setState(() {
          selectedFile = File(file.path);
          selectedBytes = null;
          fileType = 'image';
        });
      }
    }
  }

  Future<void> pickApp() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['apk', 'ipa', 'zip'],
    );
    if (result != null) {
      if (kIsWeb) {
        setState(() {
          selectedBytes = result.files.first.bytes;
          selectedFile = null;
          fileType = 'app';
        });
      } else {
        setState(() {
          selectedFile = File(result.files.first.path!);
          selectedBytes = null;
          fileType = 'app';
        });
      }
    }
  }

  Future<void> upload() async {
    if ((selectedFile == null && selectedBytes == null) || fileType == null) {
      return;
    }

    setState(() => busy = true);

    final uri = Uri.parse("${api.base}/upload/");
    var request = http.MultipartRequest("POST", uri);
    request.headers['Authorization'] = 'Bearer ${widget.token}';

    // required fields for backend
    request.fields['name'] = 'Anonymous User';
    request.fields['location'] = area;
    request.fields['filetype'] = fileType!;

    if (kIsWeb && selectedBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        selectedBytes!,
        filename: 'upload.${fileType == 'image' ? 'png' : 'apk'}',
      ));
    } else if (selectedFile != null) {
      request.files
          .add(await http.MultipartFile.fromPath('file', selectedFile!.path));
    }

    final resp = await request.send();
    final body = await resp.stream.bytesToString();
    setState(() {
      busy = false;
      last = resp.statusCode == 200 ? "Upload successful" : "Error $body";
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
            'Report Suspicious Activity \n संदिग्ध गतिविधि की रिपोर्ट करें'),
        bottom: TabBar(
          controller: tc,
          tabs: const [
            Tab(text: 'SMS | एसएमएस'),
            Tab(text: 'URL | यूआरएल'),
            Tab(text: 'VOIP | वीओआईपी'),
            Tab(text: 'File | फ़ाइल'),
          ],
        ),
        actions: [
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: area,
              dropdownColor: Colors.white,
              items: areas
                  .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                  .toList(),
              onChanged: (v) => setState(() => area = v!),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout | लॉग आउट',
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => const LandingPage(),
                ),
              );
            },
          )
        ],
      ),
      body: TabBarView(controller: tc, children: [
        // SMS
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                    controller: smsText,
                    maxLines: 5,
                    decoration: const InputDecoration(
                        labelText: 'SMS text | एसएमएस टेक्स्ट',
                        border: OutlineInputBorder())),
                const SizedBox(height: 12),
                ElevatedButton(
                    onPressed: busy ? null : () => submit('sms'),
                    child: Text(busy
                        ? 'Submitting... | सबमिट कर रहा है...'
                        : 'Submit SMS Report | एसएमएस रिपोर्ट सबमिट करें')),
                if (last != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(last!)),
              ]),
        ),
        // URL
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                    controller: urlText,
                    decoration: const InputDecoration(
                        labelText: 'URL | यूआरएल',
                        border: OutlineInputBorder())),
                const SizedBox(height: 12),
                ElevatedButton(
                    onPressed: busy ? null : () => submit('url'),
                    child: Text(busy
                        ? 'Submitting... | सबमिट कर रहा है...'
                        : 'Submit URL Report | यूआरएल रिपोर्ट सबमिट करें')),
                if (last != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(last!)),
              ]),
        ),
        // VOIP
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                    controller: phoneText,
                    decoration: const InputDecoration(
                        labelText: 'Phone | फोन (+91...)',
                        border: OutlineInputBorder())),
                const SizedBox(height: 12),
                ElevatedButton(
                    onPressed: busy ? null : () => submit('voip'),
                    child: Text(busy
                        ? 'Submitting... | सबमिट कर रहा है...'
                        : 'Submit VOIP Report | वीओआईपी रिपोर्ट सबमिट करें')),
                if (last != null)
                  Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(last!)),
              ]),
        ),
        // FILE UPLOAD (Separated forms)
        SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text("Upload Image | इमेज अपलोड करें",
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ElevatedButton(
                  onPressed: busy ? null : pickImage,
                  child: const Text("Pick Image | इमेज चुनें")),
              if (fileType == 'image' && selectedFile != null)
                Text("Selected: ${selectedFile!.path.split('/').last}"),
              if (fileType == 'image' && selectedBytes != null)
                const Text("Selected: Image (Web)"),
              ElevatedButton(
                  onPressed:
                  (busy || fileType != 'image') ? null : upload,
                  child: Text(busy ? "Uploading..." : "Upload Image")),
              const Divider(height: 32, thickness: 2),
              const Text("Upload App File | ऐप फाइल अपलोड करें",
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ElevatedButton(
                  onPressed: busy ? null : pickApp,
                  child: const Text("Pick App | ऐप चुनें")),
              if (fileType == 'app' && selectedFile != null)
                Text("Selected: ${selectedFile!.path.split('/').last}"),
              if (fileType == 'app' && selectedBytes != null)
                const Text("Selected: App (Web)"),
              ElevatedButton(
                  onPressed:
                  (busy || fileType != 'app') ? null : upload,
                  child: Text(busy ? "Uploading..." : "Upload App")),
              if (last != null)
                Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(last!)),
            ],
          ),
        ),
      ]),
    );
  }
}
