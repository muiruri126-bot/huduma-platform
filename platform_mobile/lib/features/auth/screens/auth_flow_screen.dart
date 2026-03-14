import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:platform_mobile/features/auth/bloc/auth_bloc.dart';
import 'package:platform_mobile/features/auth/screens/onboarding_screen.dart';
import 'package:platform_mobile/features/auth/screens/phone_entry_screen.dart';

enum AuthPage { onboarding, phone }

/// Manages the auth flow locally without GoRouter.
/// Switches between onboarding → phone using simple setState.
class AuthFlowScreen extends StatefulWidget {
  const AuthFlowScreen({super.key});

  @override
  State<AuthFlowScreen> createState() => _AuthFlowScreenState();
}

class _AuthFlowScreenState extends State<AuthFlowScreen> {
  AuthPage _page = AuthPage.onboarding;

  void _goToPhone() => setState(() => _page = AuthPage.phone);

  void _goBack() {
    setState(() => _page = AuthPage.onboarding);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: switch (_page) {
        AuthPage.onboarding => OnboardingScreen(
            key: const ValueKey('onboarding'),
            onGetStarted: _goToPhone,
          ),
        AuthPage.phone => PhoneEntryScreen(
            key: const ValueKey('phone'),
            onBack: _goBack,
          ),
      },
    );
  }
}
