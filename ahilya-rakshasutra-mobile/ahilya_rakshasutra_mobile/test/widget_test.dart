import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:ahilya_rakshasutra_mobile/main.dart'; // package name from pubspec.yaml

void main() {
  testWidgets('smoke: app builds', (tester) async {
    await tester.pumpWidget(const App());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
