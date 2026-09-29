import { Redirect } from 'expo-router';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { useAuth } from '@/src/context/AuthContext';


/* ==========================================================================
   SPLASH SETTINGS
   ========================================================================== */

const MIN_SPLASH_DURATION_MS =
  2500;


/* ==========================================================================
   STYLEHUB LOADING SCREEN
   ========================================================================== */

function StyleHubLoadingScreen() {
  const rotation =
    useRef(
      new Animated.Value(0),
    ).current;


  /* ==========================================================================
     CIRCULAR LOADING ANIMATION
     ========================================================================== */

  useEffect(
    () => {
      const animation =
        Animated.loop(
          Animated.timing(
            rotation,
            {
              toValue: 1,

              duration: 900,

              easing:
                Easing.linear,

              useNativeDriver:
                true,
            },
          ),
        );


      animation.start();


      return () => {
        animation.stop();
      };
    },
    [
      rotation,
    ],
  );


  const rotate =
    rotation.interpolate({
      inputRange: [
        0,
        1,
      ],

      outputRange: [
        '0deg',
        '360deg',
      ],
    });


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.content
        }
      >

        {/* ================================================================
            STYLEHUB LOGO
            ================================================================ */}

        <Image
          source={
            require(
              '../assets/images/stylehub-splash.png'
            )
          }
          resizeMode="contain"
          style={
            styles.logo
          }
        />


        {/* ================================================================
            CIRCULAR LOADING INDICATOR
            ================================================================ */}

        <Animated.View
          style={[
            styles.circularLoader,

            {
              transform: [
                {
                  rotate,
                },
              ],
            },
          ]}
        >

          {/* TOP */}

          <View
            style={[
              styles.loaderDot,
              styles.dotTop,

              {
                opacity: 1,
              },
            ]}
          />


          {/* TOP RIGHT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotTopRight,

              {
                opacity: 0.9,
              },
            ]}
          />


          {/* RIGHT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotRight,

              {
                opacity: 0.8,
              },
            ]}
          />


          {/* BOTTOM RIGHT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotBottomRight,

              {
                opacity: 0.7,
              },
            ]}
          />


          {/* BOTTOM */}

          <View
            style={[
              styles.loaderDot,
              styles.dotBottom,

              {
                opacity: 0.6,
              },
            ]}
          />


          {/* BOTTOM LEFT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotBottomLeft,

              {
                opacity: 0.5,
              },
            ]}
          />


          {/* LEFT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotLeft,

              {
                opacity: 0.4,
              },
            ]}
          />


          {/* TOP LEFT */}

          <View
            style={[
              styles.loaderDot,
              styles.dotTopLeft,

              {
                opacity: 0.3,
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}


/* ==========================================================================
   ROOT SCREEN
   ========================================================================== */

export default function IndexScreen() {
  const {
    user,
    isBootstrapping,
  } =
    useAuth();


  const [
    minimumSplashFinished,
    setMinimumSplashFinished,
  ] =
    useState(false);


  /* ==========================================================================
     MINIMUM SPLASH DURATION
     ========================================================================== */

  useEffect(
    () => {
      const timer =
        setTimeout(
          () => {
            setMinimumSplashFinished(
              true,
            );
          },

          MIN_SPLASH_DURATION_MS,
        );


      return () => {
        clearTimeout(
          timer,
        );
      };
    },
    [],
  );


  /* ==========================================================================
     SHOW SPLASH
     ========================================================================== */

  if (
    isBootstrapping ||
    !minimumSplashFinished
  ) {
    return (
      <StyleHubLoadingScreen />
    );
  }


  /* ==========================================================================
     CUSTOMER
     ========================================================================== */

  if (
    user?.role ===
    'customer'
  ) {
    return (
      <Redirect
        href="/(customer)/customer"
      />
    );
  }


  /* ==========================================================================
     SHOP OWNER
     ========================================================================== */

  if (
    user?.role ===
    'shop_owner'
  ) {
    return (
      <Redirect
        href="/(shop-owner)/shop-owner"
      />
    );
  }


  /* ==========================================================================
     GUEST
     ========================================================================== */

  return (
    <Redirect
      href="/(auth)/welcome"
    />
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    content: {
      alignItems:
        'center',

      justifyContent:
        'center',

      transform: [
        {
          translateY:
            -20,
        },
      ],
    },


    /* ======================================================================
       LOGO
       ====================================================================== */

    logo: {
      width: 210,

      height: 210,
    },


    /* ======================================================================
       CIRCULAR LOADER
       ====================================================================== */

    circularLoader: {
      width: 46,

      height: 46,

      position:
        'relative',

      /*
      |--------------------------------------------------------------------------
      | Loader position
      |--------------------------------------------------------------------------
      |
      | Increased from 78 to 110 so the circular loader sits farther below
      | the StyleHub logo while keeping the logo itself in the same position.
      |
      */

      marginTop: 110,
    },


    loaderDot: {
      position:
        'absolute',

      width: 8,

      height: 8,

      borderRadius: 999,

      backgroundColor:
        '#D99202',
    },


    /* ======================================================================
       DOT POSITIONS
       ====================================================================== */

    dotTop: {
      top: 0,

      left: 19,
    },


    dotTopRight: {
      top: 6,

      right: 6,
    },


    dotRight: {
      top: 19,

      right: 0,
    },


    dotBottomRight: {
      bottom: 6,

      right: 6,
    },


    dotBottom: {
      bottom: 0,

      left: 19,
    },


    dotBottomLeft: {
      bottom: 6,

      left: 6,
    },


    dotLeft: {
      top: 19,

      left: 0,
    },


    dotTopLeft: {
      top: 6,

      left: 6,
    },
  });