import 'package:ahilya_rakshasutra_mobile/pages/landing_page.dart';
import 'package:flutter/material.dart';
import '../api.dart';

class HomePage extends StatefulWidget {
  final String token;
  final VoidCallback onLogout;
  const HomePage({super.key, required this.token, required this.onLogout});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
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
    'Palasia | पलासिया': [22.7196, 75.8577],
    'Vijay Nagar | विजय नगर': [22.7536, 75.8937],
    'Rajwada | राजवाड़ा': [22.7177, 75.8555],
    'Indrapuri | इंद्रपुरी': [22.7601, 75.8814],
    'Bhawarkuan | भँवरकुआँ': [22.6907, 75.8656],
    'Sudama Nagar | सुदामा नगर': [22.6703, 75.8277],
  };


  final smsText = TextEditingController();
  final urlText = TextEditingController();
  final phoneText = TextEditingController(text: '+91');

  bool busy = false;
  String? last;

  @override
  void initState() {
    super.initState();
    tc = TabController(length: 3, vsync: this);
  }

  Future<void> submit(String type) async {
    setState(() { busy = true; last = null; });
    final coords = areaCoords[area] ?? [22.7196,75.8577];
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
              content: Text('Report submitted successfully | रिपोर्ट सफलतापूर्वक सबमिट हो गई'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Suspicious Activity \n संदिग्ध गतिविधि की रिपोर्ट करें'),
        bottom: TabBar(
          controller: tc,
          tabs: const [
            Tab(text: 'SMS | एसएमएस'),
            Tab(text: 'URL | यूआरएल'),
            Tab(text: 'VOIP | वीओआईपी'),
          ],
        ),
        actions: [
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: area,
              dropdownColor: Colors.white,
              items: areas.map((a)=>DropdownMenuItem(value:a, child: Text(a))).toList(),
              onChanged: (v)=> setState(()=> area = v!),
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
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(controller: smsText, maxLines: 5, decoration: const InputDecoration(
                labelText: 'SMS text | एसएमएस टेक्स्ट', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: busy ? null : () => submit('sms'),
              child: Text(
                busy
                    ? 'Submitting... | सबमिट कर रहा है...'
                    : 'Submit SMS Report | एसएमएस रिपोर्ट सबमिट करें',
              ),
            ),
            if (last != null) Padding(padding: const EdgeInsets.only(top:8), child: Text(last!)),
          ]),
        ),
        // URL
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(controller: urlText, decoration: const InputDecoration(
                labelText: 'URL | यूआरएल', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: busy ? null : () => submit('url'),
                child: Text(
                  busy
                      ? 'Submitting... | सबमिट कर रहा है...'
                      : 'Submit URL Report | यूआरएल रिपोर्ट सबमिट करें',
                ),
            ),
            if (last != null) Padding(padding: const EdgeInsets.only(top:8), child: Text(last!)),
          ]),
        ),
        // VOIP
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(controller: phoneText, decoration: const InputDecoration(
                labelText: 'Phone | फोन (+91...)', border: OutlineInputBorder()
            )),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: busy ? null : () => submit('voip'),
              child: Text(
                busy
                    ? 'Submitting... | सबमिट कर रहा है...'
                    : 'Submit VOIP Report | वीओआईपी रिपोर्ट सबमिट करें',
              ),
            ),
            if (last != null) Padding(padding: const EdgeInsets.only(top:8), child: Text(last!)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // your TextFields + Buttons unchanged
                ],
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
