import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG, apiPost, buildApiUrl } from '../config/api';
import { listUnsyncedSellersFIFO, updateSellerServerId } from '../database/repositories/sellerRepo';
import { listUnsyncedBeneficiariesFIFO, updateBeneficiaryServerId } from '../database/repositories/beneficiaryRepo';
import { listUnsyncedCattleFIFO, updateCattleServerId } from '../database/repositories/cattleRepo';
import { getSellerByLocalId } from '../database/repositories/sellerRepo';
import { getBeneficiaryByLocalId } from '../database/repositories/beneficiaryRepo';
import { imageExists, getLocalImageUri } from '../utils/imageStorage';

// Simple status events for UI visibility
export type SyncPhase = 'idle' | 'sellers' | 'beneficiaries' | 'cattle';
export type SyncEvent = { phase: SyncPhase; message: string; error?: string | null };

class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private listeners: Array<(e: SyncEvent) => void> = [];
  private hadError = false;

  onStatus(listener: (e: SyncEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(e: SyncEvent) {
    this.listeners.forEach(l => {
      try { l(e); } catch {}
    });
  }

  static getInstance() {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  start() {
    if (this.unsubscribeNetInfo) return;

    // Listen to connectivity changes and trigger sync
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (isOnline) {
        this.syncAll().catch(() => {});
      }
    });

    // Also run once on start
    this.syncAll().catch(() => {});
  }

  stop() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  async manualSync() {
    return this.syncAll();
  }

  private async syncAll() {
    if (this.syncing) return;
    this.syncing = true;
    this.hadError = false;
    try {
      this.emit({ phase: 'sellers', message: 'Syncing sellers…' });
      await this.syncSellers();
      if (this.hadError) return; // stop chain
      this.emit({ phase: 'beneficiaries', message: 'Syncing beneficiaries…' });
      await this.syncBeneficiaries();
      if (this.hadError) return; // stop chain
      this.emit({ phase: 'cattle', message: 'Syncing cattle…' });
      await this.syncCattle();
      if (this.hadError) return; // stop chain
      this.emit({ phase: 'idle', message: 'Sync complete' });
    } finally {
      this.syncing = false;
    }
  }

  private async syncSellers() {
    const unsynced = await listUnsyncedSellersFIFO();
    console.log(`🔄 Syncing ${unsynced.length} sellers...`);
    this.emit({ phase: 'sellers', message: `Syncing ${unsynced.length} sellers…` });
    
    for (const item of unsynced) {
      try {
        // Validate required fields
        // Allow minimal posting; backend can validate. If name missing, send placeholder.
        if (!item.name || item.name.trim() === '') {
          item.name = 'Unknown Seller';
        }
        
        // Log the raw database item for debugging
        console.log('📋 Raw seller database item:', {
          local_id: item.local_id,
          name: item.name,
          father_or_husband: item.father_or_husband,
          village: item.village,
          mandal: item.mandal,
          district: item.district,
          state: item.state,
          phone_number: item.phone_number,
        });

        // Use JSON for sellers (no images) - match Swagger API exactly
        const phoneNumber = (item.phone_number ?? '').toString().trim();
        // Ensure required seller_id is present; derive a stable value from local_id if missing
        const sellerId = ((item as any).seller_id?.toString().trim()) || (item.server_id ? String(item.server_id) : `local-${item.local_id}`);
        const payload = {
          seller_id: sellerId,
          name: item.name.trim(),
          father_or_husband: item.father_or_husband?.trim() || '',
          aadhaar_id: item.aadhaar_id?.trim() || '000000000000',
          village: item.village?.trim() || '',
          mandal: item.mandal?.trim() || '',
          district: item.district?.trim() || '',
          state: item.state?.trim() || '',
          phone_number: phoneNumber, // send as string per Swagger
        };
        
        // Log what we're sending to the API
        console.log('📤 Seller JSON payload being sent:', payload);
        
        // Use JSON for sellers
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.SELLERS), {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const res = await response.json();
        
        if (!response.ok) {
          console.error('❌ Seller API Error:', {
            status: response.status,
            statusText: response.statusText,
            response: res,
            url: buildApiUrl(API_CONFIG.ENDPOINTS.SELLERS),
          });
          const errBody = (() => { try { return JSON.stringify(res).slice(0, 500); } catch { return String(res); } })();
          this.emit({ phase: 'sellers', message: 'Seller sync failed', error: `HTTP ${response.status} ${errBody}` });
          this.hadError = true;
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(res)}`);
        }
        
        console.log('✅ Seller sync response:', res);
        
        const serverId = res?.seller_id || res?.id || res?.uuid;
        if (serverId) {
          await updateSellerServerId(item.local_id!, String(serverId));
          console.log(`✅ Updated seller ${item.local_id} with server_id: ${serverId}`);
        }
      } catch (e) {
        console.error('❌ Failed to sync seller:', e);
        console.error('❌ Seller data:', item);
        break; // stop on first failure to maintain FIFO
      }
    }
  }

  private async syncBeneficiaries() {
    const unsynced = await listUnsyncedBeneficiariesFIFO();
    console.log(`🔄 Syncing ${unsynced.length} beneficiaries...`);
    this.emit({ phase: 'beneficiaries', message: `Syncing ${unsynced.length} beneficiaries…` });
    
    for (const item of unsynced) {
      try {
        // Validate required fields
        // Allow minimal posting; backend can validate.
        if (!item.name || item.name.trim() === '') {
          item.name = 'Unknown Beneficiary';
        }
        if (!item.beneficiary_id || item.beneficiary_id.trim() === '') {
          // If client ID is missing, try to use local_id as a temporary identifier string
          item.beneficiary_id = item.local_id ? String(item.local_id) : 'TEMP-BENEFICIARY';
        }
        
        // Check if there's a local image
        let hasImage = false;
        if (item.local_image_path) {
          hasImage = await imageExists(item.local_image_path);
        }
        
        // Log the raw database item for debugging
        console.log('📋 Raw database item:', {
          local_id: item.local_id,
          beneficiary_id: item.beneficiary_id,
          name: item.name,
          father_or_husband: item.father_or_husband,
          aadhaar_id: item.aadhaar_id,
          village: item.village,
          mandal: item.mandal,
          district: item.district,
          state: item.state,
          phone_number: item.phone_number,
          num_of_items: item.num_of_items,
          local_image_path: item.local_image_path,
        });

        // Convert phone number to match API format (string)
        const phoneNumber = (item.phone_number ?? '').toString().trim();
        
        // Convert animals_sanctioned to match API format (integer)
        const animalsCount = item.num_of_items ?? 0;

        // Validate required fields before sending
        const requiredFields = {
          beneficiary_id: item.beneficiary_id?.trim(),
          name: item.name?.trim(),
          father_or_husband: item.father_or_husband?.trim(),
          aadhaar_id: item.aadhaar_id?.trim(),
          village: item.village?.trim(),
          mandal: item.mandal?.trim(),
          district: item.district?.trim(),
          state: item.state?.trim(),
        };

        // Check for missing required fields
        const missingFields = Object.entries(requiredFields)
          .filter(([key, value]) => !value || value.length === 0)
          .map(([key]) => key);

        if (missingFields.length > 0) {
          console.error('❌ Missing required fields for beneficiary:', {
            beneficiary_id: item.beneficiary_id,
            missingFields,
            allData: requiredFields,
          });
        }

        // Validate field lengths (Django model constraints)
        const fieldLengthErrors = [];
        if (requiredFields.beneficiary_id && requiredFields.beneficiary_id.length > 100) {
          fieldLengthErrors.push('beneficiary_id > 100 chars');
        }
        if (requiredFields.name && requiredFields.name.length > 100) {
          fieldLengthErrors.push('name > 100 chars');
        }
        if (requiredFields.aadhaar_id && requiredFields.aadhaar_id.length > 12) {
          fieldLengthErrors.push('aadhaar_id > 12 chars');
        }

        if (fieldLengthErrors.length > 0) {
          console.error('❌ Field length validation errors:', fieldLengthErrors);
        }

        let response;

        if (hasImage && item.local_image_path) {
          // Use FormData when there's an image
          const formData = new FormData();
          formData.append('beneficiary_id', requiredFields.beneficiary_id || '');
          formData.append('name', requiredFields.name || '');
          formData.append('father_or_husband', requiredFields.father_or_husband || '');
          formData.append('aadhaar_id', requiredFields.aadhaar_id || '');
          formData.append('village', requiredFields.village || '');
          formData.append('mandal', requiredFields.mandal || '');
          formData.append('district', requiredFields.district || '');
          formData.append('state', requiredFields.state || '');
          formData.append('phone_number', phoneNumber);
          formData.append('num_of_items', String(animalsCount));
          
          formData.append('beneficiary_image', {
            uri: getLocalImageUri(item.local_image_path),
            name: 'beneficiary_image.jpg',
            type: 'image/jpeg',
          } as any);
          
          console.log('📤 Syncing beneficiary (FormData with image):', {
            beneficiary_id: requiredFields.beneficiary_id,
            name: requiredFields.name,
            phone_number: phoneNumber,
            num_of_items: animalsCount,
            imagePath: item.local_image_path,
          });
          
          response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.BENEFICIARIES), {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              // Don't set Content-Type for FormData
            },
            body: formData,
          });
        } else {
          // Use JSON when there's no image (matches Swagger API exactly)
          const payload = {
            beneficiary_id: requiredFields.beneficiary_id || '',
            name: requiredFields.name || '',
            father_or_husband: requiredFields.father_or_husband || '',
            aadhaar_id: requiredFields.aadhaar_id || '',
            village: requiredFields.village || '',
            mandal: requiredFields.mandal || '',
            district: requiredFields.district || '',
            state: requiredFields.state || '',
            phone_number: phoneNumber,
            num_of_items: animalsCount,
          };
          
          console.log('📤 Syncing beneficiary (JSON, no image):', payload);
          
          response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.BENEFICIARIES), {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }
        
        const res = await response.json();
        
        if (!response.ok) {
          console.error('❌ Beneficiary API Error:', {
            status: response.status,
            statusText: response.statusText,
            response: res,
            url: buildApiUrl(API_CONFIG.ENDPOINTS.BENEFICIARIES),
            sentData: hasImage ? 'FormData (check logs above)' : payload,
            hasImage: hasImage,
            imagePath: item.local_image_path,
          });
          
          // Log detailed validation errors if available
          if (res.errors || res.detail || res.message) {
            console.error('🔍 Detailed validation errors:', {
              errors: res.errors,
              detail: res.detail,
              message: res.message,
            });
          }
          const errBody = (() => { try { return JSON.stringify(res).slice(0, 500); } catch { return String(res); } })();
          this.emit({ phase: 'beneficiaries', message: 'Beneficiary sync failed', error: `HTTP ${response.status} ${errBody}` });
          this.hadError = true;
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(res)}`);
        }
        
        console.log('✅ Beneficiary sync response:', res);
        
        const serverId = res?.beneficiary_id || res?.id || res?.uuid;
        if (serverId) {
          await updateBeneficiaryServerId(item.local_id!, String(serverId));
          console.log(`✅ Updated beneficiary ${item.local_id} with server_id: ${serverId}`);
        }
      } catch (e) {
        console.error('❌ Failed to sync beneficiary:', e);
        console.error('❌ Beneficiary data:', item);
        break; // maintain FIFO
      }
    }
  }

  private async syncCattle() {
    const unsynced = await listUnsyncedCattleFIFO();
    this.emit({ phase: 'cattle', message: `Syncing ${unsynced.length} cattle…` });
    for (const item of unsynced) {
      try {
        // Ensure parents have server_id
        let sellerServerId = item.seller_server_id || null;
        let beneficiaryServerId = item.beneficiary_server_id || null;

        if (!sellerServerId && item.seller_local_id) {
          const s = await getSellerByLocalId(item.seller_local_id);
          sellerServerId = s?.server_id || null;
        }
        if (!beneficiaryServerId && item.beneficiary_local_id) {
          const b = await getBeneficiaryByLocalId(item.beneficiary_local_id);
          beneficiaryServerId = b?.server_id || null;
        }

        if (!sellerServerId || !beneficiaryServerId) {
          // Skip until parents synced
          continue;
        }

        // Use multipart FormData to match online upload behavior
        const form = new FormData();
        form.append('seller', String(sellerServerId));
        form.append('beneficiary', String(beneficiaryServerId));
        if (item.purchase_place) form.append('purchase_place', String(item.purchase_place));
        if (item.cost) form.append('cost', String(item.cost));
        if (item.insurance_premium) form.append('insurance_premium', String(item.insurance_premium));
        if (item.type) form.append('type', String(item.type));
        if (item.breed) form.append('breed', String(item.breed));
        if (item.milk_yield_per_day) form.append('milk_yield_per_day', String(item.milk_yield_per_day));
        if (item.animal_age) form.append('animal_age', String(item.animal_age));
        form.append('pregnant', String(item.pregnant === 1));
        if (item.pregnancy_months) form.append('pregnancy_months', String(item.pregnancy_months));
        if (item.calf_type) form.append('calf_type', String(item.calf_type));
        if (item.tag_no) form.append('tag_no', String(item.tag_no));

        // Append images if local files exist
        const addImage = (field: keyof typeof item, formKey: string, name: string) => {
          const path = (item as any)[field] as string | null | undefined;
          if (path && path.trim()) {
            const uri = path.startsWith('file://') ? path : `file://${path}`;
            (form as any).append(formKey, { uri, name: `${name}.jpg`, type: 'image/jpeg' });
          }
        };
        addImage('muzzle1_photo', 'muzzle1_photo', 'muzzle1');
        addImage('muzzle2_photo', 'muzzle2_photo', 'muzzle2');
        addImage('muzzle3_photo', 'muzzle3_photo', 'muzzle3');
        addImage('front_photo', 'front_photo', 'front');
        addImage('left_photo', 'left_photo', 'left');
        addImage('right_photo', 'right_photo', 'right');

        // Native fetch for multipart
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.SLOW_TIMEOUT);
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.MILCH_ANIMALS), {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: form as any,
          signal: controller.signal as any,
        });
        clearTimeout(timeout);

        const res = await response.json();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(res)}`);
        }

        const serverId = res?.animal_id || res?.id || res?.uuid;
        if (serverId) {
          await updateCattleServerId(item.local_id!, String(serverId));
        }
      } catch (e) {
        // Stop on first failure to maintain FIFO
        break;
      }
    }
  }
}

export default OfflineSyncService;