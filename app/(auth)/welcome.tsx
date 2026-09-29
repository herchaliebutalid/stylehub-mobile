import { useRouter } from 'expo-router';

import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/src/constants/colors';


/* ==========================================================================
   STYLEHUB WELCOME IMAGE

   The clean image contains only the barber / salon photo.

   Approximate original dimensions:
   941 x 1080
   ========================================================================== */

const WELCOME_IMAGE_WIDTH = 941;
const WELCOME_IMAGE_HEIGHT = 1080;

const WELCOME_IMAGE_RATIO =
  WELCOME_IMAGE_HEIGHT /
  WELCOME_IMAGE_WIDTH;


/* ==========================================================================
   STYLEHUB WELCOME SCREEN
   ========================================================================== */

export default function WelcomeScreen() {
  const router =
    useRouter();

  const insets =
    useSafeAreaInsets();

  const {
    width,
    height,
  } =
    useWindowDimensions();


  /* ==========================================================================
     RESPONSIVE PHOTO HEIGHT
     ========================================================================== */

  const naturalPhotoHeight =
    width *
    WELCOME_IMAGE_RATIO;

  const maximumPhotoHeight =
    height * 0.55;

  const minimumPhotoHeight =
    height * 0.44;

  const photoHeight =
    Math.max(
      minimumPhotoHeight,

      Math.min(
        naturalPhotoHeight,
        maximumPhotoHeight,
      ),
    );


  /* ==========================================================================
     RESPONSIVE TYPOGRAPHY
     ========================================================================== */

  const welcomeFontSize =
    Math.min(
      Math.max(
        width * 0.058,
        21,
      ),
      26,
    );

  const brandFontSize =
    Math.min(
      Math.max(
        width * 0.125,
        44,
      ),
      56,
    );

  const descriptionFontSize =
    Math.min(
      Math.max(
        width * 0.041,
        15,
      ),
      17,
    );


  /* ==========================================================================
     CONTINUE TO ROLE SELECTION
     ========================================================================== */

  function handleContinue() {
    router.replace(
      '/(auth)/role-selection',
    );
  }


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <View
      style={
        styles.screen
      }
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to StyleHub"
        accessibilityHint="Continue to account type selection"
        onPress={
          handleContinue
        }
        style={({ pressed }) => [
          styles.pressable,

          pressed &&
            styles.pressed,
        ]}
      >

        {/* ================================================================
            PHOTO
            ================================================================ */}

        <View
          style={[
            styles.photoSection,

            {
              height:
                photoHeight,
            },
          ]}
        >
          <Image
            source={
              require(
                '../../assets/images/stylehub-welcome-background.png'
              )
            }
            resizeMode="contain"
            style={
              styles.photo
            }
          />


          {/* ==============================================================
              PHOTO TO NAVY FADE

              These layers only affect the bottom part of the photo.
              The previous top shade has been removed.
              ============================================================== */}

          <View
            pointerEvents="none"
            style={
              styles.fadeOne
            }
          />

          <View
            pointerEvents="none"
            style={
              styles.fadeTwo
            }
          />

          <View
            pointerEvents="none"
            style={
              styles.fadeThree
            }
          />

          <View
            pointerEvents="none"
            style={
              styles.fadeFour
            }
          />

          <View
            pointerEvents="none"
            style={
              styles.fadeFive
            }
          />
        </View>


        {/* ================================================================
            CONTENT AREA
            ================================================================ */}

        <View
          style={[
            styles.contentSection,

            {
              paddingBottom:
                Math.max(
                  insets.bottom + 26,
                  38,
                ),
            },
          ]}
        >

          {/* ==============================================================
              MAIN COPY
              ============================================================== */}

          <View
            style={
              styles.copyBlock
            }
          >
            <Text
              style={[
                styles.welcomeText,

                {
                  fontSize:
                    welcomeFontSize,

                  lineHeight:
                    welcomeFontSize *
                    1.25,
                },
              ]}
            >
              Welcome to 👋
            </Text>


            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[
                styles.brandText,

                {
                  fontSize:
                    brandFontSize,

                  lineHeight:
                    brandFontSize *
                    1.04,
                },
              ]}
            >
              StyleHub
            </Text>


            <View
              style={
                styles.accentLine
              }
            />


            <Text
              style={[
                styles.description,

                {
                  fontSize:
                    descriptionFontSize,

                  lineHeight:
                    descriptionFontSize *
                    1.5,
                },
              ]}
            >
              Discover trusted barber and salon services for your style and beauty needs.
            </Text>
          </View>


          {/* ==============================================================
              CONTINUE HINT
              ============================================================== */}

          <View
            style={
              styles.continueContainer
            }
          >
            <View
              style={
                styles.continueDot
              }
            />

            <Text
              style={
                styles.continueText
              }
            >
              TAP ANYWHERE TO CONTINUE
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        '#0C1117',
    },


    pressable: {
      flex: 1,

      backgroundColor:
        '#0C1117',
    },


    pressed: {
      opacity: 0.985,
    },


    /* ======================================================================
       PHOTO
       ====================================================================== */

    photoSection: {
      width: '100%',

      position:
        'relative',

      overflow:
        'hidden',

      backgroundColor:
        '#0C1117',
    },


    photo: {
      width: '100%',

      height: '100%',
    },


    /* ======================================================================
       PHOTO FADE

       Only the bottom of the photo is progressively darkened.
       ====================================================================== */

    fadeOne: {
      position:
        'absolute',

      left: 0,

      right: 0,

      bottom: 125,

      height: 55,

      backgroundColor:
        'rgba(12, 17, 23, 0.04)',
    },


    fadeTwo: {
      position:
        'absolute',

      left: 0,

      right: 0,

      bottom: 90,

      height: 60,

      backgroundColor:
        'rgba(12, 17, 23, 0.13)',
    },


    fadeThree: {
      position:
        'absolute',

      left: 0,

      right: 0,

      bottom: 55,

      height: 65,

      backgroundColor:
        'rgba(12, 17, 23, 0.28)',
    },


    fadeFour: {
      position:
        'absolute',

      left: 0,

      right: 0,

      bottom: 25,

      height: 65,

      backgroundColor:
        'rgba(12, 17, 23, 0.55)',
    },


    fadeFive: {
      position:
        'absolute',

      left: 0,

      right: 0,

      bottom: 0,

      height: 48,

      backgroundColor:
        '#0C1117',
    },


    /* ======================================================================
       CONTENT SECTION
       ====================================================================== */

    contentSection: {
      flex: 1,

      backgroundColor:
        '#0C1117',

      paddingHorizontal: 30,

      paddingTop: 18,

      justifyContent:
        'space-between',
    },


    copyBlock: {
      width: '100%',
    },


    /* ======================================================================
       WELCOME TEXT
       ====================================================================== */

    welcomeText: {
      color:
        COLORS.white,

      fontWeight:
        '600',

      letterSpacing:
        -0.4,

      marginBottom: 5,
    },


    /* ======================================================================
       STYLEHUB BRAND
       ====================================================================== */

    brandText: {
      color:
        COLORS.orange,

      fontWeight:
        '800',

      letterSpacing:
        -2,

      maxWidth:
        '100%',
    },


    accentLine: {
      width: 78,

      height: 3,

      borderRadius: 999,

      backgroundColor:
        COLORS.orange,

      marginTop: 16,

      marginBottom: 23,
    },


    /* ======================================================================
       DESCRIPTION
       ====================================================================== */

    description: {
      color:
        'rgba(255, 255, 255, 0.90)',

      fontWeight:
        '400',

      maxWidth: 355,

      letterSpacing: 0,
    },


    /* ======================================================================
       CONTINUE HINT
       ====================================================================== */

    continueContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,

      marginTop: 30,

      paddingBottom: 4,
    },


    continueDot: {
      width: 8,

      height: 8,

      borderRadius: 999,

      backgroundColor:
        COLORS.orange,
    },


    continueText: {
      color:
        'rgba(255, 255, 255, 0.57)',

      fontSize: 10,

      fontWeight:
        '700',

      letterSpacing: 1.35,
    },
  });