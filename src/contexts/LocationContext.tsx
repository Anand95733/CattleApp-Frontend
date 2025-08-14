import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Telangana districts data
const telanganaDistricts = [
  { id: 'AD', name: 'Adilabad' },
  { id: 'BH', name: 'Bhadradri Kothagudem' },
  { id: 'HY', name: 'Hyderabad' },
  { id: 'JA', name: 'Jagtial' },
  { id: 'JI', name: 'Jangaon' },
  { id: 'JW', name: 'Jayashankar Bhupalpally' },
  { id: 'JU', name: 'Jogulamba Gadwal' },
  { id: 'KA', name: 'Kamareddy' },
  { id: 'KH', name: 'Karimnagar' },
  { id: 'KM', name: 'Khammam' },
  { id: 'KO', name: 'Komaram Bheem Asifabad' },
  { id: 'MA', name: 'Mahabubabad' },
  { id: 'MB', name: 'Mahabubnagar' },
  { id: 'ME', name: 'Mancherial' },
  { id: 'MD', name: 'Medak' },
  { id: 'MU', name: 'Medchal-Malkajgiri' },
  { id: 'NA', name: 'Nagarkurnool' },
  { id: 'NI', name: 'Nalgonda' },
  { id: 'NN', name: 'Nirmal' },
  { id: 'NZ', name: 'Nizamabad' },
  { id: 'PE', name: 'Peddapalli' },
  { id: 'RA', name: 'Rajanna Sircilla' },
  { id: 'RN', name: 'Rangareddy' },
  { id: 'SA', name: 'Sangareddy' },
  { id: 'SI', name: 'Siddipet' },
  { id: 'SU', name: 'Suryapet' },
  { id: 'VI', name: 'Vikarabad' },
  { id: 'WA', name: 'Wanaparthy' },
  { id: 'WL', name: 'Warangal Rural' },
  { id: 'WU', name: 'Warangal Urban' },
  { id: 'YA', name: 'Yadadri Bhuvanagiri' }
];

// All Telangana Districts Mandals Data
const telanganaMandalData = {
  // Adilabad District Mandals
  AD: [
    { id: 'AD01', name: 'Adilabad Urban' },
    { id: 'AD02', name: 'Adilabad Rural' },
    { id: 'AD03', name: 'Jainath' },
    { id: 'AD04', name: 'Tamsi' },
    { id: 'AD05', name: 'Gudihathnoor' },
    { id: 'AD06', name: 'Neradigonda' },
    { id: 'AD07', name: 'Indervelly' },
    { id: 'AD08', name: 'Mudhole' },
    { id: 'AD09', name: 'Talamadugu' },
    { id: 'AD10', name: 'Wankidi' },
    { id: 'AD11', name: 'Bazarhathnoor' },
    { id: 'AD12', name: 'Mavala' },
    { id: 'AD13', name: 'Bela' },
    { id: 'AD14', name: 'Koutala' },
    { id: 'AD15', name: 'Sirpur (T)' },
    { id: 'AD16', name: 'Ichoda' },
    { id: 'AD17', name: 'Kerameri' },
    { id: 'AD18', name: 'Tandur' }
  ],

  // Bhadradri Kothagudem District Mandals
  BH: [
    { id: 'BH01', name: 'Kothagudem' },
    { id: 'BH02', name: 'Palvancha' },
    { id: 'BH03', name: 'Pinapaka' },
    { id: 'BH04', name: 'Laxmidevipalli' },
    { id: 'BH05', name: 'Dummugudem' },
    { id: 'BH06', name: 'Burgampahad' },
    { id: 'BH07', name: 'Julurpadu' },
    { id: 'BH08', name: 'Manuguru' },
    { id: 'BH09', name: 'Aswapuram' },
    { id: 'BH10', name: 'Kunavaram' },
    { id: 'BH11', name: 'Velerupadu' },
    { id: 'BH12', name: 'Chunchupalli' },
    { id: 'BH13', name: 'Dammapeta' },
    { id: 'BH14', name: 'Sathupalli' },
    { id: 'BH15', name: 'Yellandu' },
    { id: 'BH16', name: 'Gundala' },
    { id: 'BH17', name: 'Cherla' },
    { id: 'BH18', name: 'Venkatapuram' },
    { id: 'BH19', name: 'Charla' }
  ],

  // Hyderabad District Mandals
  HY: [
    { id: 'HY01', name: 'Secunderabad' },
    { id: 'HY02', name: 'Tirumalagiri' },
    { id: 'HY03', name: 'Maredpally' },
    { id: 'HY04', name: 'Musheerabad' },
    { id: 'HY05', name: 'Amberpet' },
    { id: 'HY06', name: 'Himayatnagar' },
    { id: 'HY07', name: 'Nampally' },
    { id: 'HY08', name: 'Khairatabad' },
    { id: 'HY09', name: 'Asifnagar' },
    { id: 'HY10', name: 'Golconda' },
    { id: 'HY11', name: 'Bahadurpura' },
    { id: 'HY12', name: 'Bandlaguda' },
    { id: 'HY13', name: 'Charminar' },
    { id: 'HY14', name: 'Saidabad' },
    { id: 'HY15', name: 'Malakpet' },
    { id: 'HY16', name: 'Uppal' },
    { id: 'HY17', name: 'Hayathnagar' }
  ],

  // Jagtial District Mandals
  JA: [
    { id: 'JA01', name: 'Jagtial' },
    { id: 'JA02', name: 'Metpally' },
    { id: 'JA03', name: 'Korutla' },
    { id: 'JA04', name: 'Mallapur' },
    { id: 'JA05', name: 'Raikal' },
    { id: 'JA06', name: 'Dharmapuri' },
    { id: 'JA07', name: 'Velgatoor' },
    { id: 'JA08', name: 'Gollapalli' },
    { id: 'JA09', name: 'Ibrahimpatnam' },
    { id: 'JA10', name: 'Kathlapur' },
    { id: 'JA11', name: 'Sarangapur' },
    { id: 'JA12', name: 'Pegadapalli' }
  ],

  // Jangaon District Mandals
  JI: [
    { id: 'JI01', name: 'Jangaon' },
    { id: 'JI02', name: 'Lingalaghanpur' },
    { id: 'JI03', name: 'Kodakandla' },
    { id: 'JI04', name: 'Chilpur' },
    { id: 'JI05', name: 'Raghunathpally' },
    { id: 'JI06', name: 'Ghanpur (Station)' },
    { id: 'JI07', name: 'Palakurthi' },
    { id: 'JI08', name: 'Devaruppula' }
  ],

  // Jayashankar Bhupalpally District Mandals
  JW: [
    { id: 'JW01', name: 'Bhupalpally' },
    { id: 'JW02', name: 'Mulugu' },
    { id: 'JW03', name: 'Eturnagaram' },
    { id: 'JW04', name: 'Mogullapally' },
    { id: 'JW05', name: 'Mahabubabad' },
    { id: 'JW06', name: 'Kesamudram' },
    { id: 'JW07', name: 'Nellikudur' },
    { id: 'JW08', name: 'Kataram' },
    { id: 'JW09', name: 'Regonda' },
    { id: 'JW10', name: 'Tekumatla' },
    { id: 'JW11', name: 'Govindaraopet' },
    { id: 'JW12', name: 'Venkatapuram' }
  ],

  // Jogulamba Gadwal District Mandals
  JU: [
    { id: 'JU01', name: 'Gadwal' },
    { id: 'JU02', name: 'Ieeja' },
    { id: 'JU03', name: 'Itikyal' },
    { id: 'JU04', name: 'Alampur' },
    { id: 'JU05', name: 'Ghattu' },
    { id: 'JU06', name: 'Dharur' },
    { id: 'JU07', name: 'Undavalli' },
    { id: 'JU08', name: 'Maldakal' }
  ],

  // Kamareddy District Mandals
  KA: [
    { id: 'KA01', name: 'Kamareddy' },
    { id: 'KA02', name: 'Lingampet' },
    { id: 'KA03', name: 'Tadwai' },
    { id: 'KA04', name: 'Bhiknoor' },
    { id: 'KA05', name: 'Domakonda' },
    { id: 'KA06', name: 'Banswada' },
    { id: 'KA07', name: 'Yellareddy' },
    { id: 'KA08', name: 'Pitlam' },
    { id: 'KA09', name: 'Machareddy' },
    { id: 'KA10', name: 'Nizamsagar' },
    { id: 'KA11', name: 'Bichkunda' }
  ],

  // Karimnagar District Mandals
  KH: [
    { id: 'KH01', name: 'Karimnagar' },
    { id: 'KH02', name: 'Choppadandi' },
    { id: 'KH03', name: 'Vemulawada' },
    { id: 'KH04', name: 'Sircilla' },
    { id: 'KH05', name: 'Ellanthakunta' },
    { id: 'KH06', name: 'Manakondur' },
    { id: 'KH07', name: 'Huzurabad' },
    { id: 'KH08', name: 'Boinpally' },
    { id: 'KH09', name: 'Gangadhara' },
    { id: 'KH10', name: 'Malyal' },
    { id: 'KH11', name: 'Thimmapur' },
    { id: 'KH12', name: 'Konaraopet' },
    { id: 'KH13', name: 'Jammikunta' },
    { id: 'KH14', name: 'Huzurnagar' }
  ],

  // Khammam District Mandals
  KM: [
    { id: 'KM01', name: 'Khammam Urban' },
    { id: 'KM02', name: 'Khammam Rural' },
    { id: 'KM03', name: 'Mudigonda' },
    { id: 'KM04', name: 'Nelakondapalli' },
    { id: 'KM05', name: 'Chintakani' },
    { id: 'KM06', name: 'Konijerla' },
    { id: 'KM07', name: 'Tallada' },
    { id: 'KM08', name: 'Kusumanchi' },
    { id: 'KM09', name: 'Aswaraopeta' },
    { id: 'KM10', name: 'Dammapeta' },
    { id: 'KM11', name: 'Sathupalli' },
    { id: 'KM12', name: 'Penuballi' },
    { id: 'KM13', name: 'Kalluru' },
    { id: 'KM14', name: 'Vemsoor' },
    { id: 'KM15', name: 'Bonakal' },
    { id: 'KM16', name: 'Madhira' },
    { id: 'KM17', name: 'Yerrupalem' },
    { id: 'KM18', name: 'Wyra' },
    { id: 'KM19', name: 'Julurpadu' },
    { id: 'KM20', name: 'Bayyaram' },
    { id: 'KM21', name: 'Garla' },
    { id: 'KM22', name: 'Singareni' },
    { id: 'KM23', name: 'Kamepalli' },
    { id: 'KM24', name: 'Chandrugonda' },
    { id: 'KM25', name: 'Mulakalapalli' },
    { id: 'KM26', name: 'Thirumalayapalem' },
    { id: 'KM27', name: 'Palair' },
    { id: 'KM28', name: 'Enkoor' }
  ],

  // Komaram Bheem Asifabad District Mandals
  KO: [
    { id: 'KO01', name: 'Asifabad' },
    { id: 'KO02', name: 'Jainoor' },
    { id: 'KO03', name: 'Sirpur (U)' },
    { id: 'KO04', name: 'Kagaznagar' },
    { id: 'KO05', name: 'Rebbena' },
    { id: 'KO06', name: 'Kaghaznagar' },
    { id: 'KO07', name: 'Wankidi' }
  ],

  // Mahabubabad District Mandals
  MA: [
    { id: 'MA01', name: 'Mahabubabad' },
    { id: 'MA02', name: 'Kesamudram' },
    { id: 'MA03', name: 'Nellikudur' },
    { id: 'MA04', name: 'Dornakal' },
    { id: 'MA05', name: 'Garla' },
    { id: 'MA06', name: 'Kuravi' },
    { id: 'MA07', name: 'Bayyaram' },
    { id: 'MA08', name: 'Thorrur' }
  ],

  // Mahabubnagar District Mandals
  MB: [
    { id: 'MB01', name: 'Mahabubnagar' },
    { id: 'MB02', name: 'Koilkonda' },
    { id: 'MB03', name: 'Jadcherla' },
    { id: 'MB04', name: 'Narayanpet' },
    { id: 'MB05', name: 'Makthal' },
    { id: 'MB06', name: 'Wanaparthy' },
    { id: 'MB07', name: 'Pebbair' },
    { id: 'MB08', name: 'Devarkadra' },
    { id: 'MB09', name: 'Balanagar' },
    { id: 'MB10', name: 'Bhoothpur' },
    { id: 'MB11', name: 'Kalwakurthy' },
    { id: 'MB12', name: 'Achampet' },
    { id: 'MB13', name: 'Amangal' },
    { id: 'MB14', name: 'Midjil' },
    { id: 'MB15', name: 'Hanwada' },
    { id: 'MB16', name: 'Kothur' }
  ],

  // Mancherial District Mandals
  ME: [
    { id: 'ME01', name: 'Mancherial' },
    { id: 'ME02', name: 'Bellampalli' },
    { id: 'ME03', name: 'Mandamarri' },
    { id: 'ME04', name: 'Luxettipet' },
    { id: 'ME05', name: 'Kotapalli' },
    { id: 'ME06', name: 'Naspur' },
    { id: 'ME07', name: 'Jaipur' },
    { id: 'ME08', name: 'Chennur' },
    { id: 'ME09', name: 'Kyathampalli' }
  ],

  // Medak District Mandals
  MD: [
    { id: 'MD01', name: 'Medak' },
    { id: 'MD02', name: 'Ramayampet' },
    { id: 'MD03', name: 'Narsapur' },
    { id: 'MD04', name: 'Sadasivpet' },
    { id: 'MD05', name: 'Kulcharam' },
    { id: 'MD06', name: 'Shivampet' },
    { id: 'MD07', name: 'Tekmal' },
    { id: 'MD08', name: 'Chegunta' },
    { id: 'MD09', name: 'Shankarampet (A)' },
    { id: 'MD10', name: 'Kondapak' },
    { id: 'MD11', name: 'Mirdoddi' },
    { id: 'MD12', name: 'Doultabad' },
    { id: 'MD13', name: 'Dubbak' },
    { id: 'MD14', name: 'Siddipet' },
    { id: 'MD15', name: 'Chinnakodur' },
    { id: 'MD16', name: 'Nangnoor' },
    { id: 'MD17', name: 'Papannapet' },
    { id: 'MD18', name: 'Jharasangam' },
    { id: 'MD19', name: 'Mulkanoor' },
    { id: 'MD20', name: 'Kohir' },
    { id: 'MD21', name: 'Andole' },
    { id: 'MD22', name: 'Regode' },
    { id: 'MD23', name: 'Zahirabad' }
  ],

  // Medchal-Malkajgiri District Mandals
  MU: [
    { id: 'MU01', name: 'Medchal' },
    { id: 'MU02', name: 'Shamirpet' },
    { id: 'MU03', name: 'Malkajgiri' },
    { id: 'MU04', name: 'Quthbullapur' },
    { id: 'MU05', name: 'Kukatpally' },
    { id: 'MU06', name: 'Balanagar' },
    { id: 'MU07', name: 'Dundigal' },
    { id: 'MU08', name: 'Keesara' },
    { id: 'MU09', name: 'Ghatkesar' },
    { id: 'MU10', name: 'Saroornagar' },
    { id: 'MU11', name: 'Uppal' }
  ],

  // Nagarkurnool District Mandals
  NA: [
    { id: 'NA01', name: 'Nagarkurnool' },
    { id: 'NA02', name: 'Achampet' },
    { id: 'NA03', name: 'Kalwakurthy' },
    { id: 'NA04', name: 'Kollapur' },
    { id: 'NA05', name: 'Bijinapally' },
    { id: 'NA06', name: 'Pentlavalli' },
    { id: 'NA07', name: 'Telkapally' },
    { id: 'NA08', name: 'Uppununthala' },
    { id: 'NA09', name: 'Tadoor' }
  ],

  // Nalgonda District Mandals
  NI: [
    { id: 'NI01', name: 'Nalgonda' },
    { id: 'NI02', name: 'Miryalaguda' },
    { id: 'NI03', name: 'Kodad' },
    { id: 'NI04', name: 'Suryapet' },
    { id: 'NI05', name: 'Munugode' },
    { id: 'NI06', name: 'Nakrekal' },
    { id: 'NI07', name: 'Nidamanuru' },
    { id: 'NI08', name: 'Chandur' },
    { id: 'NI09', name: 'Devarakonda' },
    { id: 'NI10', name: 'Kangal' },
    { id: 'NI11', name: 'Thripuraram' },
    { id: 'NI12', name: 'Bhongir' },
    { id: 'NI13', name: 'Bibinagar' },
    { id: 'NI14', name: 'Pochampally' },
    { id: 'NI15', name: 'Valigonda' },
    { id: 'NI16', name: 'Bommalaramaram' },
    { id: 'NI17', name: 'Yadagirigutta' },
    { id: 'NI18', name: 'Raigir' },
    { id: 'NI19', name: 'Alair' },
    { id: 'NI20', name: 'Gundala' },
    { id: 'NI21', name: 'Damaracherla' },
    { id: 'NI22', name: 'Mattampally' },
    { id: 'NI23', name: 'Huzurnagar' },
    { id: 'NI24', name: 'Chilkur' },
    { id: 'NI25', name: 'Mothkur' },
    { id: 'NI26', name: 'Peddavoora' },
    { id: 'NI27', name: 'Choutuppal' },
    { id: 'NI28', name: 'Thirumalagiri' },
    { id: 'NI29', name: 'Atmakur (M)' },
    { id: 'NI30', name: 'Jajireddygudem' },
    { id: 'NI31', name: 'Garide' }
  ],

  // Nirmal District Mandals
  NN: [
    { id: 'NN01', name: 'Nirmal' },
    { id: 'NN02', name: 'Bhainsa' },
    { id: 'NN03', name: 'Mudhole' },
    { id: 'NN04', name: 'Khanapur' },
    { id: 'NN05', name: 'Mamda' },
    { id: 'NN06', name: 'Lokeshwaram' },
    { id: 'NN07', name: 'Dandepalli' },
    { id: 'NN08', name: 'Kasturba' },
    { id: 'NN09', name: 'Laxmanchanda' },
    { id: 'NN10', name: 'Kubeer' },
    { id: 'NN11', name: 'Dilawarpur' },
    { id: 'NN12', name: 'Sarangapur' }
  ],

  // Nizamabad District Mandals
  NZ: [
    { id: 'NZ01', name: 'Nizamabad Urban' },
    { id: 'NZ02', name: 'Nizamabad Rural' },
    { id: 'NZ03', name: 'Bodhan' },
    { id: 'NZ04', name: 'Jukkal' },
    { id: 'NZ05', name: 'Banswada' },
    { id: 'NZ06', name: 'Armoor' },
    { id: 'NZ07', name: 'Balkonda' },
    { id: 'NZ08', name: 'Kotagiri' },
    { id: 'NZ09', name: 'Dichpally' },
    { id: 'NZ10', name: 'Navipet' },
    { id: 'NZ11', name: 'Varni' },
    { id: 'NZ12', name: 'Bheemgal' },
    { id: 'NZ13', name: 'Mortad' },
    { id: 'NZ14', name: 'Jakranpally' },
    { id: 'NZ15', name: 'Bichkunda' },
    { id: 'NZ16', name: 'Renjal' },
    { id: 'NZ17', name: 'Yedpally' },
    { id: 'NZ18', name: 'Kamareddy' },
    { id: 'NZ19', name: 'Madnoor' },
    { id: 'NZ20', name: 'Machareddy' },
    { id: 'NZ21', name: 'Yellareddy' },
    { id: 'NZ22', name: 'Pitlam' },
    { id: 'NZ23', name: 'Sirikonda' }
  ],

  // Peddapalli District Mandals
  PE: [
    { id: 'PE01', name: 'Peddapalli' },
    { id: 'PE02', name: 'Sultanabad' },
    { id: 'PE03', name: 'Godavarikhani' },
    { id: 'PE04', name: 'Ramagundam' },
    { id: 'PE05', name: 'Manthani' },
    { id: 'PE06', name: 'Dharmaram' },
    { id: 'PE07', name: 'Julapalli' },
    { id: 'PE08', name: 'Gollapalli' },
    { id: 'PE09', name: 'Odela' },
    { id: 'PE10', name: 'Kalvasrirampur' }
  ],

  // Rajanna Sircilla District Mandals
  RA: [
    { id: 'RA01', name: 'Sircilla' },
    { id: 'RA02', name: 'Vemulawada' },
    { id: 'RA03', name: 'Konaraopet' },
    { id: 'RA04', name: 'Yellareddypet' },
    { id: 'RA05', name: 'Gambhiraopet' },
    { id: 'RA06', name: 'Chandurthi' },
    { id: 'RA07', name: 'Mustabad' },
    { id: 'RA08', name: 'Boinpally' },
    { id: 'RA09', name: 'Thangallapalli' }
  ],

  // Rangareddy District Mandals
  RN: [
    { id: 'RN01', name: 'Shamshabad' },
    { id: 'RN02', name: 'Rajendranagar' },
    { id: 'RN03', name: 'Moinabad' },
    { id: 'RN04', name: 'Chevella' },
    { id: 'RN05', name: 'Vikarabad' },
    { id: 'RN06', name: 'Tandur' },
    { id: 'RN07', name: 'Basheerabad' },
    { id: 'RN08', name: 'Yalal' },
    { id: 'RN09', name: 'Shankarpally' },
    { id: 'RN10', name: 'Maheshwaram' },
    { id: 'RN11', name: 'Ibrahimpatnam' },
    { id: 'RN12', name: 'Manchal' },
    { id: 'RN13', name: 'Yacharam' },
    { id: 'RN14', name: 'Keesara' },
    { id: 'RN15', name: 'Ghatkesar' },
    { id: 'RN16', name: 'Medchal' },
    { id: 'RN17', name: 'Malkajgiri' },
    { id: 'RN18', name: 'Kapra' },
    { id: 'RN19', name: 'Uppal' },
    { id: 'RN20', name: 'Hayathnagar' },
    { id: 'RN21', name: 'Saroornagar' },
    { id: 'RN22', name: 'L.B. Nagar' },
    { id: 'RN23', name: 'Vanasthalipuram' },
    { id: 'RN24', name: 'Abdullahpurmet' },
    { id: 'RN25', name: 'Kandukur' }
  ],

  // Sangareddy District Mandals
  SA: [
    { id: 'SA01', name: 'Sangareddy' },
    { id: 'SA02', name: 'Patancheru' },
    { id: 'SA03', name: 'Gajwel' },
    { id: 'SA04', name: 'Zahirabad' },
    { id: 'SA05', name: 'Narayankhed' },
    { id: 'SA06', name: 'Kalher' },
    { id: 'SA07', name: 'Kangti' },
    { id: 'SA08', name: 'Hatnoora' },
    { id: 'SA09', name: 'Kondapur' },
    { id: 'SA10', name: 'Farooqnagar' },
    { id: 'SA11', name: 'Sadasivpet' },
    { id: 'SA12', name: 'Kulcharam' },
    { id: 'SA13', name: 'Jharasangam' },
    { id: 'SA14', name: 'Pulkal' },
    { id: 'SA15', name: 'Andole' },
    { id: 'SA16', name: 'Ameenpur' }
  ],

  // Siddipet District Mandals
  SI: [
    { id: 'SI01', name: 'Siddipet' },
    { id: 'SI02', name: 'Dubbak' },
    { id: 'SI03', name: 'Gajwel' },
    { id: 'SI04', name: 'Kondapak' },
    { id: 'SI05', name: 'Nangnoor' },
    { id: 'SI06', name: 'Papannapet' },
    { id: 'SI07', name: 'Chinnakodur' },
    { id: 'SI08', name: 'Husnabad' },
    { id: 'SI09', name: 'Mirdoddi' },
    { id: 'SI10', name: 'Harischandrapuram' },
    { id: 'SI11', name: 'Kohir' },
    { id: 'SI12', name: 'Mulkanoor' },
    { id: 'SI13', name: 'Akkannapet' },
    { id: 'SI14', name: 'Wargal' },
    { id: 'SI15', name: 'Thoguta' },
    { id: 'SI16', name: 'Markook' },
    { id: 'SI17', name: 'Doultabad' },
    { id: 'SI18', name: 'Bejjanki' },
    { id: 'SI19', name: 'Chegunta' }
  ],

  // Suryapet District Mandals
  SU: [
    { id: 'SU01', name: 'Suryapet' },
    { id: 'SU02', name: 'Kodad' },
    { id: 'SU03', name: 'Huzurnagar' },
    { id: 'SU04', name: 'Mattampally' },
    { id: 'SU05', name: 'Nadigudem' },
    { id: 'SU06', name: 'Munagala' },
    { id: 'SU07', name: 'Penpahad' },
    { id: 'SU08', name: 'Thungathurthi' },
    { id: 'SU09', name: 'Atmakur (S)' },
    { id: 'SU10', name: 'Jajireddygudem' },
    { id: 'SU11', name: 'Mothkur' },
    { id: 'SU12', name: 'Garidepally' },
    { id: 'SU13', name: 'Palakeedu' },
    { id: 'SU14', name: 'Chivvemla' },
    { id: 'SU15', name: 'Neredcherla' },
    { id: 'SU16', name: 'Tirumalagiri (S)' },
    { id: 'SU17', name: 'Chilkur' },
    { id: 'SU18', name: 'Nuthankal' },
    { id: 'SU19', name: 'Peddavoora' },
    { id: 'SU20', name: 'Mellachervu' }
  ],

  // Vikarabad District Mandals
  VI: [
    { id: 'VI01', name: 'Vikarabad' },
    { id: 'VI02', name: 'Tandur' },
    { id: 'VI03', name: 'Basheerabad' },
    { id: 'VI04', name: 'Bantwaram' },
    { id: 'VI05', name: 'Peddemul' },
    { id: 'VI06', name: 'Dharur' },
    { id: 'VI07', name: 'Doma' },
    { id: 'VI08', name: 'Bomraspet' },
    { id: 'VI09', name: 'Kodangal' },
    { id: 'VI10', name: 'Kosgi' },
    { id: 'VI11', name: 'Pargi' },
    { id: 'VI12', name: 'Yalal' }
  ],

  // Wanaparthy District Mandals
  WA: [
    { id: 'WA01', name: 'Wanaparthy' },
    { id: 'WA02', name: 'Pebbair' },
    { id: 'WA03', name: 'Atmakur (W)' },
    { id: 'WA04', name: 'Gopalpet' },
    { id: 'WA05', name: 'Kothakota' },
    { id: 'WA06', name: 'Revally' },
    { id: 'WA07', name: 'Srirangapur' },
    { id: 'WA08', name: 'Pangal' }
  ],

  // Warangal Rural District Mandals
  WL: [
    { id: 'WL01', name: 'Parkal' },
    { id: 'WL02', name: 'Parvathagiri' },
    { id: 'WL03', name: 'Shayampet' },
    { id: 'WL04', name: 'Mahabubabad' },
    { id: 'WL05', name: 'Kuravi' },
    { id: 'WL06', name: 'Bachannapet' },
    { id: 'WL07', name: 'Duggondi' },
    { id: 'WL08', name: 'Atmakur' },
    { id: 'WL09', name: 'Geesugonda' },
    { id: 'WL10', name: 'Chennaraopet' },
    { id: 'WL11', name: 'Rayaparthy' },
    { id: 'WL12', name: 'Wardhannapet' },
    { id: 'WL13', name: 'Kesamudram' },
    { id: 'WL14', name: 'Nellikudur' },
    { id: 'WL15', name: 'Maripeda' },
    { id: 'WL16', name: 'Bhupalpally' },
    { id: 'WL17', name: 'Mulugu' },
    { id: 'WL18', name: 'Eturnagaram' },
    { id: 'WL19', name: 'Govindaraopet' },
    { id: 'WL20', name: 'Tadvai' },
    { id: 'WL21', name: 'Eturunagaram' }
  ],

  // Warangal Urban District Mandals
  WU: [
    { id: 'WU01', name: 'Warangal' },
    { id: 'WU02', name: 'Hasanparthy' },
    { id: 'WU03', name: 'Kazipet' },
    { id: 'WU04', name: 'Elkathurthy' },
    { id: 'WU05', name: 'Dharmasagar' },
    { id: 'WU06', name: 'Huzurabad' },
    { id: 'WU07', name: 'Kamalapur' },
    { id: 'WU08', name: 'Raiparthy' },
    { id: 'WU09', name: 'Sangem' },
    { id: 'WU10', name: 'Narsampet' },
    { id: 'WU11', name: 'Duggondi' },
    { id: 'WU12', name: 'Khanapur (AP)' }
  ],

  // Yadadri Bhuvanagiri District Mandals
  YA: [
    { id: 'YA01', name: 'Bhongir' },
    { id: 'YA02', name: 'Yadagirigutta' },
    { id: 'YA03', name: 'Alair' },
    { id: 'YA04', name: 'Bibinagar' },
    { id: 'YA05', name: 'Pochampally' },
    { id: 'YA06', name: 'Valigonda' },
    { id: 'YA07', name: 'Bommalaramaram' },
    { id: 'YA08', name: 'Raigir' },
    { id: 'YA09', name: 'Gundala' },
    { id: 'YA10', name: 'Turkapally' },
    { id: 'YA11', name: 'Choutuppal' },
    { id: 'YA12', name: 'Rajapet' },
    { id: 'YA13', name: 'Mothkur' }
  ]
};

// Combine all data
const telanganaData = {
  districts: telanganaDistricts,
  mandals: telanganaMandalData
};

interface District {
  id: string;
  name: string;
}

interface Mandal {
  id: string;
  name: string;
}

interface LocationState {
  selectedState: string;
  selectedDistrict: string;
  selectedMandal: string;
  districts: District[];
  mandals: Mandal[];
}

interface LocationContextType {
  locationState: LocationState;
  setSelectedDistrict: (districtId: string) => void;
  setSelectedMandal: (mandalId: string) => void;
  getAllDistricts: () => District[];
  getMandalsByDistrict: (districtId: string) => Mandal[];
  getDistrictName: (districtId: string) => string;
  getMandalName: (mandalId: string) => string;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [locationState, setLocationState] = useState<LocationState>({
    selectedState: 'TS',
    selectedDistrict: '',
    selectedMandal: '',
    districts: telanganaData.districts,
    mandals: []
  });

  const setSelectedDistrict = (districtId: string) => {
    const mandals = telanganaData.mandals[districtId as keyof typeof telanganaData.mandals] || [];
    setLocationState(prev => ({
      ...prev,
      selectedDistrict: districtId,
      selectedMandal: '', // Reset mandal when district changes
      mandals: mandals
    }));
  };

  const setSelectedMandal = (mandalId: string) => {
    setLocationState(prev => ({
      ...prev,
      selectedMandal: mandalId
    }));
  };

  const getAllDistricts = (): District[] => {
    return telanganaData.districts;
  };

  const getMandalsByDistrict = (districtId: string): Mandal[] => {
    return telanganaData.mandals[districtId as keyof typeof telanganaData.mandals] || [];
  };

  const getDistrictName = (districtId: string): string => {
    const district = telanganaData.districts.find(d => d.id === districtId);
    return district ? district.name : '';
  };

  const getMandalName = (mandalId: string): string => {
    // Search through all mandals in all districts
    for (const districtMandals of Object.values(telanganaData.mandals)) {
      const mandal = districtMandals.find(m => m.id === mandalId);
      if (mandal) {
        return mandal.name;
      }
    }
    return '';
  };

  const contextValue: LocationContextType = {
    locationState,
    setSelectedDistrict,
    setSelectedMandal,
    getAllDistricts,
    getMandalsByDistrict,
    getDistrictName,
    getMandalName
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};