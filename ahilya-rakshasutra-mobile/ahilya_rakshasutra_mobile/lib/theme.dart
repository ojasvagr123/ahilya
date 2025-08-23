// theme.dart (optional helper file)
import 'package:flutter/material.dart';

const brandOrange = Color(0xFFE67700);
const brandCream  = Color(0xFFFFF3E0);
const brandBrown  = Color(0xFF4E2A00);

final appTheme = ThemeData(
  brightness: Brightness.light,
  scaffoldBackgroundColor: brandCream,
  colorScheme: ColorScheme.fromSeed(
    seedColor: brandOrange,
    brightness: Brightness.light,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: brandOrange,
    foregroundColor: Colors.white,
    elevation: 0,
    centerTitle: true,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: brandOrange,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: brandOrange, width: 2),
    ),
  ),
  // tabBarTheme: const TabBarTheme(
  //   labelColor: brandOrange,
  //   indicatorColor: brandOrange,
  //   unselectedLabelColor: brandBrown,
  // ),
  snackBarTheme: const SnackBarThemeData(backgroundColor: brandOrange),
);
