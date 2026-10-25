
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StyleHubModal from '@/src/components/StyleHubModal';
import { COLORS } from '@/src/constants/colors';
import { LAYOUT, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  approveShopOwnerRescheduleRequest,
  getShopOwnerRescheduleRequest,
  rejectShopOwnerRescheduleRequest,
} from '@/src/services/shop-owner-api';
import type {
  ShopOwnerRescheduleRequest,
  ShopOwnerRescheduleRequestStatus,
} from '@/src/types/shop-owner';

type IconName = ComponentProps<typeof Ionicons>['name'];
type RequestModal = 'approve' | 'rejectReason' | 'reject' | 'success' | null;

function routeValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatPrice(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₱${amount.toFixed(2)}` : String(value);
}

function formatDate(value: string): string {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  if (hour < 0 || hour > 23) return value;
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
  }).format(date);
}

function statusStyle(status: ShopOwnerRescheduleRequestStatus): {
  icon: IconName; color: string; background: string;
} {
  switch (status) {
    case 'pending':
      return { icon: 'time-outline', color: COLORS.warning, background: COLORS.warningSoft };
    case 'approved':
      return { icon: 'checkmark-circle-outline', color: COLORS.green, background: COLORS.greenSoft };
    case 'rejected':
      return { icon: 'close-circle-outline', color: COLORS.danger, background: COLORS.dangerSoft };
    case 'withdrawn':
      return { icon: 'return-up-back-outline', color: COLORS.textMuted, background: COLORS.surfaceSoft };
  }
}

export default function ShopOwnerRescheduleRequestDetailScreen() {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const { token } = useAuth();
  const requestId = Number(routeValue(params.requestId));

  const [request, setRequest] = useState<ShopOwnerRescheduleRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeModal, setActiveModal] = useState<RequestModal>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalError, setModalError] = useState('');

  const loadRequest = useCallback(async (showLoading = true): Promise<void> => {
    if (!token || !Number.isInteger(requestId) || requestId < 1) {
      setIsLoading(false);
      setErrorMessage('The selected reschedule request is invalid.');
      return;
    }
    if (showLoading) setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await getShopOwnerRescheduleRequest(token, requestId);
      setRequest(response.data.reschedule_request);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Unable to load this reschedule request.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [token, requestId]);

  useEffect(() => { void loadRequest(); }, [loadRequest]);

  const pending = request?.status === 'pending';
  const appointment = request?.appointment;
  const customerName = appointment?.customer?.full_name?.trim() || 'Customer';
  const requestedDate = request ? formatDate(request.requested_date) : '';
  const requestedTime = request
    ? `${formatTime(request.requested_starts_at)} – ${formatTime(request.requested_ends_at)}` : '';

  function openApprove(): void {
    if (!pending || processingRef.current) return;
    setErrorMessage(''); setSuccessMessage(''); setModalError('');
    setActiveModal('approve');
  }

  function openReject(): void {
    if (!pending || processingRef.current) return;
    setErrorMessage(''); setSuccessMessage(''); setModalError('');
    setRejectionReason(''); setActiveModal('rejectReason');
  }

  function closeModal(): void {
    if (processingRef.current) return;
    if (activeModal === 'reject') {
      setActiveModal('rejectReason');
    } else {
      setActiveModal(null);
      setRejectionReason('');
    }
    setModalError('');
  }

  function reviewRejectReason(): void {
    if (!pending || processingRef.current) return;
    const reason = rejectionReason.trim();
    if (reason.length < 5 || reason.length > 1000) {
      setModalError('Rejection reason must contain between 5 and 1000 characters.');
      return;
    }
    setModalError(''); setActiveModal('reject');
  }

  async function performAction(action: 'approve' | 'reject'): Promise<void> {
    if (!token || !request || request.status !== 'pending' || processingRef.current) return;
    const reason = rejectionReason.trim();
    if (action === 'reject' && (reason.length < 5 || reason.length > 1000)) {
      setModalError('Rejection reason must contain between 5 and 1000 characters.');
      setActiveModal('rejectReason');
      return;
    }
    processingRef.current = true;
    setIsProcessing(true);
    setModalError('');
    setErrorMessage('');
    try {
      const response = action === 'approve'
        ? await approveShopOwnerRescheduleRequest(token, requestId)
        : await rejectShopOwnerRescheduleRequest(token, requestId, reason);
      setRequest({
        ...response.data.reschedule_request,
        appointment: response.data.reschedule_request.appointment ?? request.appointment,
      });
      setSuccessMessage(response.message ?? (action === 'approve'
        ? 'The reschedule request was approved successfully.'
        : 'The reschedule request was rejected successfully.'));
      setActiveModal('success');
      setRejectionReason('');
    } catch (error) {
      // Keep the confirmation open and show Laravel's error inside it.
      setModalError(error instanceof ApiError ? error.message
        : `Unable to ${action} this reschedule request.`);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }

  if (isLoading && !request) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={COLORS.navy} />
          <Text style={styles.stateTitle}>Loading reschedule request</Text>
          <Text style={styles.stateText}>Getting the current and requested schedules.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={32} color={COLORS.navy} />
          <Text style={styles.stateTitle}>Request unavailable</Text>
          <Text style={styles.stateText}>{errorMessage || 'Unable to display this request.'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusStyle(request.status);
  const createdAt = formatTimestamp(request.created_at);
  const reviewedAt = formatTimestamp(request.reviewed_at);
  const appointmentDate = appointment ? formatDate(appointment.appointment_date) : 'Unavailable';
  const appointmentTime = appointment
    ? `${formatTime(appointment.starts_at)} – ${formatTime(appointment.ends_at)}` : 'Unavailable';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={styles.topHeading}>
            <Text style={styles.topTitle}>Reschedule request</Text>
            <Text style={styles.topSubtitle}>Request #{request.id}</Text>
          </View>
          <TouchableOpacity onPress={() => void loadRequest(false)} disabled={isProcessing} accessibilityRole="button" accessibilityLabel="Refresh request" style={styles.iconButton}>
            <Ionicons name="refresh-outline" size={21} color={COLORS.navy} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>SCHEDULE CHANGE</Text>
          <Text style={styles.title}>Compare the appointment before making a decision</Text>
          <Text style={styles.subtitle}>Review the current appointment, the customer's requested schedule, and the reason for the change.</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Ionicons name="swap-horizontal-outline" size={24} color={COLORS.white} /></View>
            <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
              <Ionicons name={status.icon} size={14} color={status.color} />
              <Text style={[styles.badgeText, { color: status.color }]}>{request.status_label}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{appointment?.service_snapshot.name || 'Appointment reschedule'}</Text>
          <Text style={styles.heroSubtitle}>Customer requested a different date and time for this booking.</Text>
          <View style={styles.heroStats}>
            {appointment ? <>
              <HeroStat label="Price" value={formatPrice(appointment.service_snapshot.price)} />
              <View style={styles.heroDivider} />
              <HeroStat label="Duration" value={`${appointment.service_snapshot.duration_minutes} min`} />
            </> : null}
            {createdAt ? <>
              {appointment ? <View style={styles.heroDivider} /> : null}
              <HeroStat label="Requested" value={createdAt} />
            </> : null}
          </View>
        </View>

        {errorMessage ? <MessageBox success={false} message={errorMessage} /> : null}
        {successMessage && activeModal === null ? <MessageBox success message={successMessage} /> : null}

        <SectionHeading title="Schedule comparison" subtitle="Compare the current booking with the customer's requested change." />
        <View style={styles.comparisonCard}>
          <SchedulePanel icon="calendar-outline" label="Appointment schedule" date={appointmentDate} time={appointmentTime} muted />
          <View style={styles.scheduleArrow}><Ionicons name="arrow-down-outline" size={19} color={COLORS.navy} /></View>
          <SchedulePanel icon="calendar-clear-outline" label="Requested schedule" date={requestedDate} time={requestedTime} />
        </View>

        {appointment?.customer ? <>
          <SectionHeading title="Customer" subtitle="Contact details for the customer requesting the change." />
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{customerName.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.customerNameBlock}>
                <Text style={styles.customerName}>{customerName}</Text>
                <Text style={styles.mutedText}>StyleHub customer</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <ContactRow icon="mail-outline" label="Email" value={appointment.customer.email} />
            <ContactRow icon="call-outline" label="Mobile number" value={appointment.customer.phone_number} />
          </View>
        </> : null}

        <SectionHeading title="Customer reason" subtitle="Why the customer wants to move the appointment." />
        <View style={styles.reasonCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={21} color={COLORS.navy} />
          <Text style={styles.reasonText}>{request.customer_reason?.trim() || 'The customer did not provide a reason.'}</Text>
        </View>

        {!pending ? <>
          <SectionHeading title="Request history" subtitle="Latest recorded decision information for this request." />
          <View style={styles.historyCard}>
            <HistoryRow icon={status.icon} label="Current status" value={request.status_label} color={status.color} background={status.background} />
            {request.reviewer ? <HistoryRow icon="person-outline" label="Reviewed by" value={request.reviewer.full_name} /> : null}
            {reviewedAt ? <HistoryRow icon="time-outline" label="Reviewed at" value={reviewedAt} /> : null}
            {request.rejection_reason ? <HistoryRow icon="document-text-outline" label="Rejection reason" value={request.rejection_reason} color={COLORS.danger} background={COLORS.dangerSoft} /> : null}
          </View>
        </> : <>
          <SectionHeading title="Review request" subtitle="Approve only after checking that the requested time works for your shop." />
          <View style={styles.actionCard}>
            <View style={styles.notice}>
              <Ionicons name="shield-checkmark-outline" size={21} color={COLORS.blue} />
              <Text style={styles.noticeText}>Laravel rechecks business hours and appointment conflicts before approving and updating the booking.</Text>
            </View>
            <TouchableOpacity onPress={openApprove} disabled={isProcessing} accessibilityRole="button" style={[styles.primaryButton, isProcessing && styles.disabled]}>
              <Ionicons name="checkmark-circle-outline" size={19} color={COLORS.white} />
              <Text style={styles.primaryText}>Approve requested schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openReject} disabled={isProcessing} accessibilityRole="button" style={[styles.dangerButton, isProcessing && styles.disabled]}>
              <Ionicons name="close-circle-outline" size={19} color={COLORS.danger} />
              <Text style={styles.dangerText}>Reject request</Text>
            </TouchableOpacity>
          </View>
        </>}

        {!pending ? <View style={styles.finalCard}>
          <Ionicons name={status.icon} size={21} color={status.color} />
          <Text style={styles.finalText}>This reschedule request is {request.status_label.toLowerCase()} and no further decision is required.</Text>
        </View> : null}
      </ScrollView>

      <StyleHubModal
        visible={activeModal !== null}
        onClose={closeModal}
        dismissOnBackdrop={false}
        title={activeModal === 'approve' ? 'Approve requested schedule?'
          : activeModal === 'rejectReason' ? 'Why reject this request?'
          : activeModal === 'reject' ? 'Reject reschedule request?' : 'Request updated'}
        message={activeModal === 'approve'
          ? 'Laravel will recheck business hours and appointment conflicts before changing this booking.'
          : activeModal === 'rejectReason'
            ? 'Give the customer a clear reason why you cannot approve their requested schedule.'
            : activeModal === 'reject'
              ? 'The customer will see your reason. Their requested schedule will not be approved.'
              : successMessage}
        tone={activeModal === 'success' ? 'success' : activeModal === 'approve' ? 'info' : 'danger'}
        icon={activeModal === 'success' ? 'checkmark-circle-outline'
          : activeModal === 'approve' ? 'calendar-outline'
          : activeModal === 'rejectReason' ? 'document-text-outline' : 'close-circle-outline'}
        actions={activeModal === 'approve' ? [
          { label: 'Keep pending', variant: 'secondary', onPress: closeModal },
          { label: 'Approve request', variant: 'primary', icon: 'checkmark-circle-outline', loading: isProcessing, onPress: () => void performAction('approve') },
        ] : activeModal === 'rejectReason' ? [
          { label: 'Keep pending', variant: 'secondary', onPress: closeModal },
          { label: 'Continue', variant: 'primary', icon: 'arrow-forward-outline', disabled: rejectionReason.trim().length < 5, onPress: reviewRejectReason },
        ] : activeModal === 'reject' ? [
          { label: 'Edit reason', variant: 'secondary', onPress: closeModal },
          { label: 'Reject request', variant: 'danger', icon: 'close-circle-outline', loading: isProcessing, onPress: () => void performAction('reject') },
        ] : activeModal === 'success' ? [
          { label: 'Done', variant: 'primary', onPress: closeModal },
        ] : []}
      >
        {activeModal === 'rejectReason' ? <View style={styles.modalForm}>
          <Text style={styles.modalLabel}>Rejection reason *</Text>
          <TextInput
            value={rejectionReason}
            onChangeText={(value) => { setRejectionReason(value); if (modalError) setModalError(''); }}
            editable={!isProcessing}
            multiline
            textAlignVertical="top"
            maxLength={1000}
            placeholder="Example: The requested time is no longer available."
            placeholderTextColor={COLORS.textLight}
            selectionColor={COLORS.navy}
            accessibilityLabel="Rejection reason"
            style={styles.modalInput}
          />
          <View style={styles.modalMeta}>
            <Text style={styles.modalHint}>Minimum 5 characters</Text>
            <Text style={styles.modalHint}>{rejectionReason.length}/1000</Text>
          </View>
        </View> : null}
        {activeModal === 'reject' ? <View style={styles.modalPreview}>
          <Text style={styles.modalPreviewLabel}>Rejection reason</Text>
          <Text style={styles.modalPreviewText}>{rejectionReason.trim()}</Text>
        </View> : null}
        {activeModal === 'approve' ? <View style={styles.modalPreview}>
          <Text style={styles.modalPreviewLabel}>Requested schedule</Text>
          <Text style={styles.modalPreviewText}>{requestedDate}</Text>
          <Text style={styles.modalPreviewText}>{requestedTime}</Text>
        </View> : null}
        {activeModal !== 'success' && modalError ? <View style={styles.modalError}>
          <Ionicons name="alert-circle-outline" size={17} color={COLORS.danger} />
          <Text style={styles.modalErrorText}>{modalError}</Text>
        </View> : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.heroStat}>
    <Text style={styles.heroStatLabel}>{label}</Text>
    <Text style={styles.heroStatValue} numberOfLines={2}>{value}</Text>
  </View>;
}

function SchedulePanel({ icon, label, date, time, muted = false }: {
  icon: IconName; label: string; date: string; time: string; muted?: boolean;
}) {
  return <View style={[styles.schedulePanel, muted ? styles.scheduleMuted : styles.scheduleRequested]}>
    <View style={styles.scheduleIcon}><Ionicons name={icon} size={19} color={muted ? COLORS.textMuted : COLORS.navy} /></View>
    <Text style={[styles.scheduleLabel, !muted && styles.requestedLabel]}>{label}</Text>
    <Text style={styles.scheduleDate}>{date}</Text>
    <Text style={styles.scheduleTime}>{time}</Text>
  </View>;
}

function ContactRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={styles.contactRow}>
    <View style={styles.contactIcon}><Ionicons name={icon} size={18} color={COLORS.navy} /></View>
    <View style={styles.contactText}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={styles.contactValue} selectable>{value}</Text>
    </View>
  </View>;
}

function HistoryRow({ icon, label, value, color = COLORS.navy, background = COLORS.accentSoft }: {
  icon: IconName; label: string; value: string; color?: string; background?: string;
}) {
  return <View style={styles.historyRow}>
    <View style={[styles.historyIcon, { backgroundColor: background }]}><Ionicons name={icon} size={19} color={color} /></View>
    <View style={styles.contactText}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={styles.historyValue}>{value}</Text>
    </View>
  </View>;
}

function MessageBox({ success, message }: { success: boolean; message: string }) {
  return <View style={[styles.messageBox, { backgroundColor: success ? COLORS.successSoft : COLORS.dangerSoft }]}>
    <Ionicons name={success ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={20} color={success ? COLORS.success : COLORS.danger} />
    <View style={styles.contactText}>
      <Text style={[styles.messageTitle, { color: success ? COLORS.success : COLORS.danger }]}>
        {success ? 'Request updated' : 'Action needs attention'}
      </Text>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { width: '100%', maxWidth: LAYOUT.contentMaxWidth, alignSelf: 'center', paddingHorizontal: LAYOUT.screenPadding, paddingTop: 40, paddingBottom: 48 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: LAYOUT.iconButtonSize, height: LAYOUT.iconButtonSize, alignItems: 'center', justifyContent: 'center', borderRadius: RADII.pill },
  topHeading: { flex: 1, marginHorizontal: 6 },
  topTitle: { color: COLORS.text, fontSize: TYPOGRAPHY.cardTitle, fontWeight: '800', textAlign: 'center' },
  topSubtitle: { marginTop: 1, color: COLORS.textMuted, fontSize: TYPOGRAPHY.micro, textAlign: 'center' },
  header: { marginTop: SPACING.lg },
  eyebrow: { color: COLORS.accent, fontSize: TYPOGRAPHY.micro, fontWeight: '800', letterSpacing: 1.2 },
  title: { maxWidth: 560, marginTop: 5, color: COLORS.text, fontSize: TYPOGRAPHY.title, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { maxWidth: 610, marginTop: 8, color: COLORS.textMuted, fontSize: TYPOGRAPHY.body, lineHeight: 21 },
  heroCard: { marginTop: SPACING.xl, padding: 18, borderRadius: RADII.xl, backgroundColor: COLORS.primary, ...SHADOWS.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: COLORS.navyMuted },
  statusBadge: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: RADII.pill },
  badgeText: { fontSize: TYPOGRAPHY.micro, fontWeight: '800' },
  heroTitle: { marginTop: 16, color: COLORS.white, fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: { marginTop: 4, color: '#D4DAE1', fontSize: TYPOGRAPHY.caption, lineHeight: 18 },
  heroStats: { marginTop: 16, paddingTop: 14, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: COLORS.navyMuted },
  heroStat: { flex: 1, minWidth: 0 },
  heroStatLabel: { color: '#AEB8C5', fontSize: TYPOGRAPHY.micro, fontWeight: '600' },
  heroStatValue: { marginTop: 4, color: COLORS.white, fontSize: TYPOGRAPHY.caption, lineHeight: 17, fontWeight: '800' },
  heroDivider: { width: 1, marginHorizontal: 10, backgroundColor: COLORS.navyMuted },
  messageBox: { marginTop: SPACING.md, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: RADII.md },
  messageTitle: { fontSize: TYPOGRAPHY.secondary, fontWeight: '800' },
  messageText: { marginTop: 3, color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, lineHeight: 18 },
  sectionHeading: { marginTop: SPACING.xxl, marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: TYPOGRAPHY.section, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { marginTop: 3, color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, lineHeight: 17 },
  comparisonCard: { padding: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.xl, backgroundColor: COLORS.surface, ...SHADOWS.card },
  schedulePanel: { padding: 14, borderRadius: RADII.lg },
  scheduleMuted: { backgroundColor: COLORS.surfaceSoft },
  scheduleRequested: { backgroundColor: COLORS.accentSoft },
  scheduleIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: COLORS.surface },
  scheduleLabel: { marginTop: 8, color: COLORS.textMuted, fontSize: TYPOGRAPHY.micro, fontWeight: '800' },
  requestedLabel: { color: COLORS.navy },
  scheduleDate: { marginTop: 4, color: COLORS.text, fontSize: TYPOGRAPHY.secondary, fontWeight: '800' },
  scheduleTime: { marginTop: 4, color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, fontWeight: '700' },
  scheduleArrow: { width: 34, height: 34, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 7, borderRadius: 17, backgroundColor: COLORS.accentSoft },
  customerCard: { padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.xl, backgroundColor: COLORS.surface, ...SHADOWS.card },
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText: { color: COLORS.white, fontSize: TYPOGRAPHY.section, fontWeight: '800' },
  customerNameBlock: { flex: 1 },
  customerName: { color: COLORS.text, fontSize: TYPOGRAPHY.cardTitle, fontWeight: '800' },
  mutedText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, lineHeight: 18 },
  divider: { height: 1, marginVertical: 13, backgroundColor: COLORS.border },
  contactRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11 },
  contactIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.accentSoft },
  contactText: { flex: 1, minWidth: 0 },
  contactValue: { marginTop: 3, color: COLORS.text, fontSize: TYPOGRAPHY.body, fontWeight: '700' },
  reasonCard: { padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADII.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  reasonText: { flex: 1, color: COLORS.textMuted, fontSize: TYPOGRAPHY.body, lineHeight: 20 },
  historyCard: { padding: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.xl, backgroundColor: COLORS.surface },
  historyRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, paddingVertical: 9 },
  historyIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  historyValue: { marginTop: 3, color: COLORS.text, fontSize: TYPOGRAPHY.caption, fontWeight: '700', lineHeight: 19 },
  actionCard: { padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.xl, backgroundColor: COLORS.surface, ...SHADOWS.card },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: RADII.md, backgroundColor: COLORS.blueSoft },
  noticeText: { flex: 1, color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, lineHeight: 18 },
  primaryButton: { marginTop: 14, minHeight: LAYOUT.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADII.md, backgroundColor: COLORS.primary },
  primaryText: { color: COLORS.white, fontSize: TYPOGRAPHY.body, fontWeight: '800' },
  dangerButton: { marginTop: 10, minHeight: LAYOUT.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADII.md, backgroundColor: COLORS.dangerSoft },
  dangerText: { color: COLORS.danger, fontSize: TYPOGRAPHY.body, fontWeight: '800' },
  finalCard: { marginTop: SPACING.xxl, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  finalText: { flex: 1, color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption, lineHeight: 19 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 25 },
  stateTitle: { color: COLORS.text, fontSize: TYPOGRAPHY.cardTitle, fontWeight: '800', textAlign: 'center' },
  stateText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.body, lineHeight: 20, textAlign: 'center' },
  backButton: { marginTop: 8, paddingVertical: 11, paddingHorizontal: 18, backgroundColor: COLORS.primary, borderRadius: RADII.md },
  backButtonText: { color: COLORS.white, fontWeight: '800' },
  disabled: { opacity: 0.48 },
  modalForm: { width: '100%' },
  modalLabel: { marginBottom: 8, color: COLORS.text, fontSize: 12, fontWeight: '700' },
  modalInput: { minHeight: 105, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADII.md, backgroundColor: COLORS.surfaceSoft, color: COLORS.text, fontSize: 13, lineHeight: 19 },
  modalMeta: { marginTop: 7, flexDirection: 'row', justifyContent: 'space-between' },
  modalHint: { color: COLORS.textMuted, fontSize: 10 },
  modalPreview: { width: '100%', padding: 12, borderRadius: RADII.md, backgroundColor: COLORS.surfaceSoft },
  modalPreviewLabel: { color: COLORS.textLight, fontSize: 10, fontWeight: '700' },
  modalPreviewText: { marginTop: 5, color: COLORS.text, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  modalError: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: RADII.md, backgroundColor: COLORS.dangerSoft },
  modalErrorText: { flex: 1, color: COLORS.danger, fontSize: 11, lineHeight: 17 },
});
