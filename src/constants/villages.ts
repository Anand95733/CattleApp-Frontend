// src/constants/villages.ts

export interface Village { id: string; name: string; }

// Minimal sample villages mapped by mandalId (expand as needed)
export const TELANGANA_VILLAGES: Record<string, Village[]> = {
  // Hyderabad district sample mandals
  HY05: [ // Amberpet
    { id: 'HY05V01', name: 'Amberpet Village 1' },
    { id: 'HY05V02', name: 'Amberpet Village 2' },
  ],
  HY07: [ // Nampally
    { id: 'HY07V01', name: 'Nampally Village 1' },
    { id: 'HY07V02', name: 'Nampally Village 2' },
  ],
  HY13: [ // Charminar
    { id: 'HY13V01', name: 'Charminar Village 1' },
    { id: 'HY13V02', name: 'Charminar Village 2' },
  ],
  HY16: [ // Uppal
    { id: 'HY16V01', name: 'Uppal Village 1' },
    { id: 'HY16V02', name: 'Uppal Village 2' },
  ],
};