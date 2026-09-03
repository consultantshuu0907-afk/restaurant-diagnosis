// ========================================
// グローバル変数
// ========================================
const TOTAL_QUESTIONS = 6;
let currentQuestion = 1;
let diagnosisData = {};

// Q1のエリア選択肢の表示順（公式料金データのキー。北から南の並び）
const AREA_ORDER = ['hokkaido', 'kitakanto', 'shutoken', 'hokuriku', 'shizuoka',
    'tokai', 'shiga', 'kansai', 'chugoku', 'kyushu'];

// 予算帯 → 上限金額（税別）。premium は上限なし
const BUDGET_CEILING = {
    low: 200000,
    medium: 500000,
    high: 1000000,
    premium: null
};

// 配点（合計100点）
const WEIGHTS = {
    employmentType: 30, // 雇用形態マッチング
    jobCategory: 25,    // 職種カテゴリマッチング
    targetAge: 20,      // ターゲット層マッチング
    budget: 15,         // 予算マッチング
    priority: 10        // 重視ポイントマッチング
};

// ========================================
// 求人媒体データベース（6媒体）
// ========================================
const mediaDatabase = {
    'e-career': {
        name: 'イーキャリア',
        catch: 'SBグループ運営。テクノロジー活用のマッチング型求人サイト',
        features: [
            'ソフトバンクグループが運営する総合転職サイト',
            'スカウト機能が充実し、待ちだけでなく攻めの採用が可能',
            '応募課金型プランがあり初期費用を抑えやすい',
            'IT・営業・事務系の20〜30代が中心ボリューム',
            '求人原稿の自動最適化などデジタル施策に強み'
        ],
        pricing: '掲載料: 20万円〜 / 応募課金型もあり',
        pricingVerified: false,
        targetEmployment: ['fulltime', 'contract'],
        targetJobs: ['it', 'sales', 'office', 'other'],
        targetAge: ['20s', '30s'],
        budgetRange: ['low', 'medium'],
        strengths: ['cost', 'matching']
    },
    'mynavi-baito': {
        name: 'マイナビバイト',
        catch: '掲載課金と応募課金を選べる、学生・フリーター層に強い大手求人サイト',
        features: [
            'アルバイト・パート採用の大手求人サイト（正社員プランもあり）',
            '学生・10代〜20代前半の利用者比率が非常に高い',
            '飲食・小売・サービス業の掲載実績が豊富',
            '掲載課金・応募課金（1応募8,000円〜）・回数券・年間プランから選べる',
            'エリアは関東／関西／東海／その他の4区分で価格が変わる'
        ],
        pricing: '公式料金表を参照（下記「料金の目安」）',
        pricingVerified: true,
        priceKey: 'mynavi',
        // 公式料金表に「正社員プラン」があるため正社員採用にも対応する
        targetEmployment: ['parttime', 'contract', 'fulltime'],
        targetJobs: ['service', 'sales', 'office', 'manufacturing'],
        targetAge: ['student', '20s', 'female'],
        budgetRange: ['low', 'medium', 'high', 'premium'], // 起動時に実データから再計算
        strengths: ['cost', 'volume', 'speed']
    },
    'mynavi-tenshoku': {
        name: 'マイナビ転職',
        catch: '20〜30代の正社員採用における定番の総合転職サイト',
        features: [
            '若手〜中堅層の正社員採用でトップクラスの知名度',
            '全国・全職種をカバーする総合型の転職サイト',
            '転職フェアなどオフラインイベントとの連動が可能',
            '専任担当による原稿作成・改善提案のサポートが手厚い',
            '第二新卒・未経験歓迎の募集と相性が良い'
        ],
        pricing: '掲載料: 20万円〜80万円（4週間・枠サイズによる）',
        pricingVerified: false,
        targetEmployment: ['fulltime', 'contract'],
        targetJobs: ['sales', 'office', 'it', 'service', 'manufacturing', 'other'],
        targetAge: ['20s', '30s'],
        budgetRange: ['medium', 'high'],
        strengths: ['volume', 'support', 'matching']
    },
    'baitoru': {
        name: 'バイトル',
        catch: '動画・画像で職場を見せられる、ディップ運営のアルバイト・パート求人サイト',
        features: [
            'ディップ株式会社が運営するアルバイト・パート向け大手求人サイト',
            '動画・職場写真で「働くイメージ」を直接伝えられる',
            '10代〜20代の学生・フリーター層の利用比率が高い',
            '飲食・小売・物流・介護など現場職の掲載が豊富',
            'エリア×プラン×枠数×期間の組み合わせで掲載費を細かく調整できる'
        ],
        pricing: '公式料金表を参照（下記「料金の目安」）',
        pricingVerified: true,
        priceKey: 'baitoru',
        targetEmployment: ['parttime', 'contract'],
        targetJobs: ['service', 'sales', 'manufacturing', 'medical', 'office'],
        targetAge: ['student', '20s', '30s', 'female'],
        budgetRange: ['low', 'medium', 'high', 'premium'], // 起動時に実データから再計算
        strengths: ['volume', 'speed', 'cost']
    },
    'baitoru-next': {
        name: 'バイトルNEXT',
        catch: 'バイトルの会員基盤を活かした、正社員・契約社員向けのディップ運営媒体',
        features: [
            'ディップ株式会社が運営する社員（正社員・契約社員）採用向け媒体',
            'バイトルブランドの認知度を活かして幅広い層にリーチできる',
            '動画や職場写真での訴求ができ、職場の雰囲気を伝えやすい',
            'サービス・製造・物流・介護など現場職の中途採用と相性が良い',
            'アルバイトからの正社員登用・キャリアアップ訴求にも使える'
        ],
        pricing: '公式料金表を参照（下記「料金の目安」）',
        pricingVerified: true,
        priceKey: 'next',
        targetEmployment: ['fulltime', 'contract'],
        targetJobs: ['service', 'manufacturing', 'medical', 'sales'],
        targetAge: ['20s', '30s', '40s'],
        budgetRange: ['low', 'medium', 'high', 'premium'], // 起動時に実データから再計算
        strengths: ['cost', 'volume', 'speed']
    },
    'doda': {
        name: 'doda',
        catch: '国内最大級の会員数。経験者・即戦力採用に強い総合転職サービス',
        features: [
            '国内最大級の会員データベースを保有する総合転職サービス',
            '20代後半〜40代の経験者・即戦力層に強い',
            '求人広告とエージェントサービスを併用できる',
            'IT・エンジニア、営業、管理部門の登録者が特に多い',
            'スカウト機能でターゲットに直接アプローチ可能'
        ],
        pricing: '掲載料: 50万円〜180万円 / 人材紹介は成功報酬型（理論年収の約35%）',
        pricingVerified: false,
        targetEmployment: ['fulltime', 'contract'],
        targetJobs: ['it', 'sales', 'office', 'other', 'manufacturing'],
        targetAge: ['20s', '30s', '40s'],
        budgetRange: ['high', 'premium'],
        strengths: ['matching', 'volume', 'support']
    },
    'woman-type': {
        name: '女の転職type',
        catch: '正社員で働きたい女性に特化した転職サイト',
        features: [
            '正社員希望の女性に特化したターゲット型媒体',
            '20代後半〜30代の女性会員が中心',
            '事務・営業・販売・企画系など幅広い職種をカバー',
            '「産休・育休実績あり」など働きやすさ条件で検索される',
            'ターゲットが絞られているためミスマッチが起きにくい'
        ],
        pricing: '掲載料: 25万円〜80万円（4週間・枠サイズによる）',
        pricingVerified: false,
        targetEmployment: ['fulltime', 'contract'],
        targetJobs: ['office', 'sales', 'service', 'other'],
        targetAge: ['20s', '30s', 'female'],
        budgetRange: ['medium', 'high'],
        strengths: ['matching', 'support']
    }
};

// ========================================
// 表示用ラベル
// ========================================
const LABELS = {
    area: {},
    employmentType: {
        fulltime: '正社員',
        contract: '契約社員',
        parttime: 'アルバイト・パート',
        dispatch: '派遣社員'
    },
    jobCategory: {
        sales: '営業',
        office: '事務・管理',
        it: 'IT・エンジニア',
        service: 'サービス・接客',
        manufacturing: '製造・物流・建設',
        medical: '医療・介護・保育',
        other: 'その他・専門職'
    },
    targetAge: {
        student: '学生・10代',
        '20s': '20代',
        '30s': '30代',
        '40s': '40代以上',
        female: '女性中心'
    },
    budget: {
        low: '〜20万円',
        medium: '20〜50万円',
        high: '50〜100万円',
        premium: '100万円〜'
    },
    priority: {
        cost: 'コストパフォーマンス',
        volume: '応募数の多さ',
        matching: '応募の質・マッチング精度',
        speed: 'スピード',
        support: '運用サポート'
    }
};

const SUMMARY_TITLES = {
    employmentType: '雇用形態',
    jobCategory: '職種カテゴリ',
    targetAge: 'ターゲット層',
    budget: '予算帯',
    priority: '重視ポイント'
};

// 媒体の属性 → 診断項目のキー対応（タグ表示用）
const MEDIA_FIELD_MAP = {
    employmentType: 'targetEmployment',
    jobCategory: 'targetJobs',
    targetAge: 'targetAge',
    budget: 'budgetRange',
    priority: 'strengths'
};

// ========================================
// ディップ公式料金データ（js/pricing-data.js）ユーティリティ
// ========================================
function hasDipPricing() {
    return typeof dipPricing !== 'undefined' && dipPricing !== null;
}

function yen(value) {
    return '¥' + Number(value).toLocaleString('ja-JP');
}

// 総額 ÷ 枠数 ÷ 週数 = 7日／1枠あたり単価（PDF記載値と一致することを検証済み）
function unitPrice(total, slotLabel, weeks) {
    return total / (parseInt(slotLabel, 10) * weeks);
}

// 公式料金データのエリア一覧（Q1の選択肢・料金表のセレクトで共用）
function areaRegions() {
    if (!hasDipPricing()) {
        return [];
    }
    const regions = dipPricing.baitoru.regions;
    const ordered = [];
    AREA_ORDER.forEach(function (key) {
        regions.forEach(function (r) {
            if (r.key === key) {
                ordered.push(r);
            }
        });
    });
    // AREA_ORDER に無いエリアがあっても取りこぼさない
    regions.forEach(function (r) {
        if (AREA_ORDER.indexOf(r.key) === -1) {
            ordered.push(r);
        }
    });
    return ordered;
}

// Q1「募集エリア」の選択肢を料金データから生成する
function renderAreaOptions() {
    const host = document.getElementById('areaOptions');
    if (!host) {
        return;
    }
    const regions = areaRegions();
    if (!regions.length) {
        host.innerHTML = '<p class="pricing-empty">エリアデータを読み込めませんでした。</p>';
        return;
    }
    host.innerHTML = regions.map(function (r) {
        LABELS.area[r.key] = r.name;
        return '<label class="option">' +
            '<input type="radio" name="area" value="' + r.key + '">' +
            '<span class="option-body">' +
                '<span class="option-icon"><i class="fas fa-location-dot"></i></span>' +
                '<span class="option-text">' +
                    '<span class="option-label">' + r.name.replace('版', '') + '</span>' +
                    '<span class="option-desc">' + r.area + '</span>' +
                '</span>' +
            '</span>' +
        '</label>';
    }).join('');
}

function findRegion(priceKey, regionKey) {
    if (!hasDipPricing() || !dipPricing[priceKey]) {
        return null;
    }
    const regions = dipPricing[priceKey].regions;
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].key === regionKey) {
            return regions[i];
        }
    }
    return null;
}

// 選択された予算帯の上限（複数選択時はもっとも高い帯を採用）。上限なしは null
function budgetCeiling(budgets) {
    let ceiling = 0;
    for (let i = 0; i < (budgets || []).length; i++) {
        const v = BUDGET_CEILING[budgets[i]];
        if (v === null) {
            return null;
        }
        if (v > ceiling) {
            ceiling = v;
        }
    }
    return ceiling || null;
}

// ========================================
// マイナビバイト料金データ（js/pricing-mynavi.js）ユーティリティ
// ========================================
function hasMynaviPricing() {
    return typeof mynaviPricing !== 'undefined' && mynaviPricing !== null;
}

/**
 * 雇用形態の回答から、マイナビバイトのどの料金表を使うかを決める。
 * 正社員のみの募集なら「正社員プラン」、それ以外は「マイナビバイトプラン」。
 */
function mynaviSectionKey(employmentTypes) {
    const et = employmentTypes || [];
    return (et.indexOf('fulltime') !== -1 && et.indexOf('parttime') === -1)
        ? 'fulltime' : 'parttime';
}

/**
 * マイナビバイトの、指定エリアで購入できる掲載プランを列挙する。
 * 対象は「基本プラン」と「フリープラン」のみ（回数券・年間プランは
 * 1回の掲載ではないため、金額の比較からは外して注記で案内する）。
 */
function mynaviRegionOffers(dipArea, sectionKey) {
    if (!hasMynaviPricing()) {
        return null;
    }
    const m = mynaviPricing;
    const area4 = m.areaMap[dipArea];
    const ai = m.areas.indexOf(area4);
    const section = m[sectionKey];
    if (ai < 0 || !section) {
        return null;
    }

    function rankOf(product) {
        const i = m.productOrder.indexOf(product.replace(/^PP/, 'AD'));
        return i < 0 ? 99 : i;
    }

    const offers = [];
    function add(row, suffix, value, column) {
        if (value === null || value === undefined) {
            return;
        }
        offers.push({
            yen: value,
            plan: row.product + suffix,
            slot: row.sites ? row.sites + '勤務地' : '',
            period: row.period,
            column: column,
            rank: rankOf(row.product)
        });
    }

    section.basic.forEach(function (row) {
        if (row.area4) {
            add(row, '（基本プラン）', row.area4[ai], area4);
        } else if (row.area7) {
            // ADスタンダードプラスだけ7区分。首都圏は3区分に分かれる
            (m.spAreaMap[dipArea] || []).forEach(function (sa) {
                add(row, '（基本プラン）', row.area7[m.spAreas.indexOf(sa)], sa);
            });
        } else if (row.flat) {
            add(row, '（基本プラン）', row.flat, '全国共通');
        }
    });
    section.free.forEach(function (row) {
        if (row.flat) {
            add(row, '（フリープラン）', row.flat, '全国共通');
        }
    });

    return {
        label: m.label,
        sectionKey: sectionKey,
        sectionLabel: section.label,
        area: area4,
        areaDef: m.areaDef[area4],
        standard: offers,
        all: offers
    };
}

/**
 * 指定エリアで購入できるプランを1件ずつ列挙する。
 * 上位プラン（PL/P系）はエリア内に市区版の列があるため、
 * 基準となる最終列（例: 首都圏版）を「そのエリアの標準料金」として扱い、
 * 市区版は最高額の算出のみに使う。
 */
function dipRegionOffers(priceKey, regionKey) {
    const media = dipPricing[priceKey];
    const region = findRegion(priceKey, regionKey);
    if (!media || !region) {
        return null;
    }
    const rank = media.topPlans.concat(media.lowPlans);
    const base = region.columns.length - 1;
    const standard = [];   // そのエリアの標準料金（基準列＋下位プラン）
    const all = [];        // 市区版を含む全て

    media.topPlans.forEach(function (plan) {
        const slots = region.top[plan] || {};
        Object.keys(slots).forEach(function (slot) {
            slots[slot].forEach(function (col, ci) {
                col.forEach(function (value, pi) {
                    if (value === null || value === undefined) {
                        return;
                    }
                    const offer = {
                        yen: value, plan: plan, slot: slot,
                        period: media.topPeriods[pi],
                        column: region.columns[ci],
                        rank: rank.indexOf(plan)
                    };
                    all.push(offer);
                    if (ci === base) {
                        standard.push(offer);
                    }
                });
            });
        });
    });

    media.lowPlans.forEach(function (plan) {
        const slots = region.low[plan] || {};
        Object.keys(slots).forEach(function (slot) {
            slots[slot].forEach(function (total, pi) {
                if (total === null || total === undefined) {
                    return;
                }
                const offer = {
                    yen: total, plan: plan, slot: slot,
                    period: media.lowPeriods[pi],
                    column: region.name,
                    rank: rank.indexOf(plan)
                };
                all.push(offer);
                standard.push(offer);
            });
        });
    });

    return { media: media, region: region, standard: standard, all: all };
}

/**
 * エリアと予算をふまえた料金要約。
 * - cheapest : そのエリアで最も安い掲載
 * - best     : 予算内に収まるもののうち、もっとも露出度の高いプラン
 * - max      : そのエリアの最高額（市区版を含む）
 */
function dipRegionSummary(priceKey, regionKey, budgets) {
    const offers = dipRegionOffers(priceKey, regionKey);
    if (!offers || !offers.standard.length) {
        return null;
    }
    const ceiling = budgetCeiling(budgets);

    let cheapest = offers.standard[0];
    offers.standard.forEach(function (o) {
        if (o.yen < cheapest.yen) {
            cheapest = o;
        }
    });

    let max = offers.all[0];
    offers.all.forEach(function (o) {
        if (o.yen > max.yen) {
            max = o;
        }
    });

    // 予算内で使える「もっとも露出度の高いプラン」を探し、
    // 同じプランの中では最小構成（＝そのプランを使い始められる価格）を提示する。
    let best = null;
    if (ceiling !== null) {
        offers.standard.forEach(function (o) {
            if (o.yen > ceiling) {
                return;
            }
            if (!best || o.rank < best.rank || (o.rank === best.rank && o.yen < best.yen)) {
                best = o;
            }
        });
    }

    return {
        label: offers.media.label,
        region: offers.region,
        ceiling: ceiling,
        cheapest: cheapest,
        best: best,
        max: max,
        hasSubAreas: offers.region.columns.length > 1
    };
}

/**
 * 全国レンジの要約（エリア未選択時のフォールバック）
 */
function dipSummary(priceKey) {
    if (!hasDipPricing() || !dipPricing[priceKey]) {
        return null;
    }
    const media = dipPricing[priceKey];
    let cheapest = null;
    let cheapestRegions = [];
    let shutoken = null;
    let max = null;

    media.regions.forEach(function (region) {
        // 下段プラン（A〜D）から1枠の最安を探す
        Object.keys(region.low).forEach(function (plan) {
            const totals = region.low[plan]['1枠'];
            if (!totals) {
                return;
            }
            totals.forEach(function (total, pi) {
                if (total === null) {
                    return;
                }
                const rec = { yen: total, plan: plan, slot: '1枠', period: media.lowPeriods[pi] };
                if (!cheapest || total < cheapest.yen) {
                    cheapest = rec;
                    cheapestRegions = [region.name];
                } else if (total === cheapest.yen &&
                           plan === cheapest.plan &&
                           media.lowPeriods[pi] === cheapest.period &&
                           cheapestRegions.indexOf(region.name) === -1) {
                    cheapestRegions.push(region.name);
                }
                if (region.key === 'shutoken' && (!shutoken || total < shutoken.yen)) {
                    shutoken = rec;
                }
            });
        });

        // 上段プラン（PL / P(EX) / P）から最高額を探す
        Object.keys(region.top).forEach(function (plan) {
            Object.keys(region.top[plan]).forEach(function (slot) {
                region.top[plan][slot].forEach(function (col, ci) {
                    col.forEach(function (value, pi) {
                        if (value === null || value === undefined) {
                            return;
                        }
                        if (!max || value > max.yen) {
                            max = {
                                yen: value,
                                plan: plan,
                                slot: slot,
                                period: media.topPeriods[pi],
                                column: region.columns[ci]
                            };
                        }
                    });
                });
            });
        });
    });

    if (!cheapest || !max) {
        return null;
    }
    return {
        label: media.label,
        cheapest: cheapest,
        cheapestRegions: cheapestRegions,
        shutoken: shutoken,
        max: max
    };
}

function regionsLabel(names) {
    if (names.length === 1) {
        return names[0];
    }
    return names[0] + 'ほか' + (names.length - 1) + 'エリア';
}

function offerText(o) {
    return [o.plan, o.slot, o.period].filter(function (v) { return v; }).join(' ');
}

/**
 * 掲載プランの一覧から「最安」「予算内で使える最上位プラン（最小構成）」「最高」を求める。
 * 媒体をまたいで同じ計算を使うための共通処理。
 */
function summarizeOffers(standard, all, ceiling) {
    if (!standard || !standard.length) {
        return null;
    }
    let cheapest = standard[0];
    standard.forEach(function (o) {
        if (o.yen < cheapest.yen) {
            cheapest = o;
        }
    });
    let max = all[0];
    all.forEach(function (o) {
        if (o.yen > max.yen) {
            max = o;
        }
    });
    let best = null;
    if (ceiling !== null) {
        standard.forEach(function (o) {
            if (o.yen > ceiling) {
                return;
            }
            if (!best || o.rank < best.rank || (o.rank === best.rank && o.yen < best.yen)) {
                best = o;
            }
        });
    }
    return { cheapest: cheapest, best: best, max: max, ceiling: ceiling };
}

// マイナビバイトのエリア別要約
function mynaviRegionSummary(regionKey, budgets, employmentTypes) {
    const offers = mynaviRegionOffers(regionKey, mynaviSectionKey(employmentTypes));
    if (!offers) {
        return null;
    }
    const s = summarizeOffers(offers.standard, offers.all, budgetCeiling(budgets));
    if (!s) {
        return null;
    }
    s.label = offers.label;
    s.areaName = offers.area;
    s.areaDef = offers.areaDef;
    s.sectionLabel = offers.sectionLabel;
    return s;
}

// 金額 → 予算帯キー
function budgetBandOf(value) {
    if (value <= BUDGET_CEILING.low) {
        return 'low';
    }
    if (value <= BUDGET_CEILING.medium) {
        return 'medium';
    }
    if (value <= BUDGET_CEILING.high) {
        return 'high';
    }
    return 'premium';
}

/**
 * 公式料金データを持つ媒体の budgetRange を、実際の料金から導出して上書きする。
 * 手で書いた予算帯が実データとズレるのを防ぐため、起動時に必ず同期する。
 */
function syncDipBudgetRanges() {
    if (!hasDipPricing()) {
        return;
    }
    Object.keys(mediaDatabase).forEach(function (id) {
        const media = mediaDatabase[id];
        if (!media.priceKey) {
            return;
        }
        if (media.priceKey === 'mynavi' ? !hasMynaviPricing() : !dipPricing[media.priceKey]) {
            return;
        }
        const bands = {};
        if (media.priceKey === 'mynavi') {
            Object.keys(mynaviPricing.areaMap).forEach(function (areaKey) {
                ['parttime', 'fulltime'].forEach(function (kind) {
                    const offers = mynaviRegionOffers(areaKey, kind);
                    if (offers) {
                        offers.all.forEach(function (o) { bands[budgetBandOf(o.yen)] = true; });
                    }
                });
            });
        } else {
            dipPricing[media.priceKey].regions.forEach(function (region) {
                const offers = dipRegionOffers(media.priceKey, region.key);
                if (offers) {
                    offers.all.forEach(function (o) { bands[budgetBandOf(o.yen)] = true; });
                }
            });
        }
        media.budgetRange = ['low', 'medium', 'high', 'premium'].filter(function (b) {
            return bands[b];
        });
    });
}

// 結果カードに表示する料金ボックスのHTML（選択エリアの料金で算出）
function pricingBoxHtml(media, data) {
    // マイナビバイト（公式料金表と照合済み・エリア4区分）
    if (media.priceKey === 'mynavi') {
        const regionKey = data && data.area;
        const s = regionKey
            ? mynaviRegionSummary(regionKey, data.budget, data.employmentType) : null;
        if (!s) {
            return '<p class="pricing-box">' + media.pricing + '</p>';
        }
        let rows = '';
        if (s.best) {
            rows += pricingRow('ご予算内で使える最上位プラン', s.best.yen,
                offerText(s.best) + '（この構成から利用可）', 'is-best');
        } else if (s.ceiling !== null) {
            rows += '<div class="pricing-row"><span class="pricing-row-label">ご予算内の選択肢</span>' +
                '<span class="pricing-row-yen">—</span>' +
                '<span class="pricing-row-note">' + yen(s.ceiling) + ' 以内に収まるプランがありません</span></div>';
        }
        rows += pricingRow('このエリアの最安', s.cheapest.yen,
            offerText(s.cheapest) + '（' + s.cheapest.column + '）');
        rows += pricingRow('このエリアの最高', s.max.yen,
            offerText(s.max) + '（' + s.max.column + '）');
        return '<div class="pricing-box pricing-box-detail">' +
            '<p class="pricing-verified-badge"><i class="fas fa-circle-check"></i> 公式料金表と照合済み</p>' +
            '<p class="pricing-box-area"><i class="fas fa-location-dot"></i> ' +
                s.areaName + '（' + s.areaDef + '）／' + s.sectionLabel + '</p>' +
            rows +
            '<p class="pricing-box-foot">※上記は1回の掲載料です。ほかに応募課金型（エントリー）・回数券（10回分）・年間プラン・オプションがあります。</p>' +
            '<p class="pricing-box-foot">マイナビバイト料金表 No.MB202509（2025年9月時点・税抜）より算出</p>' +
            '<button class="btn btn-outline btn-sm" onclick="showPricing(\'mynavi\')">' +
            '<i class="fas fa-table"></i> マイナビバイトの料金表を見る</button>' +
            '</div>';
    }
    if (!media.priceKey) {
        return '<div class="pricing-box pricing-box-ref">' +
            '<p class="pricing-ref-badge"><i class="fas fa-triangle-exclamation"></i> 参考値（公式料金表と未照合）</p>' +
            '<p class="pricing-ref-value">' + media.pricing + '</p>' +
            '<p class="pricing-box-foot">正確な金額は媒体社の最新料金表をご確認ください。</p>' +
            '</div>';
    }
    const regionKey = data && data.area;
    const s = regionKey ? dipRegionSummary(media.priceKey, regionKey, data.budget) : null;
    if (!s) {
        // エリア未選択時は全国レンジで表示
        const g = dipSummary(media.priceKey);
        if (!g) {
            return '<p class="pricing-box">' + media.pricing + '</p>';
        }
        return '<div class="pricing-box pricing-box-detail">' +
            pricingRow('全国の最安', g.cheapest.yen,
                offerText(g.cheapest) + '（' + regionsLabel(g.cheapestRegions) + '）') +
            pricingRow('全国の最高', g.max.yen, offerText(g.max) + '（' + g.max.column + '）') +
            '<p class="pricing-box-foot">エリアを選ぶと、そのエリアの料金で算出します</p>' +
            '<button class="btn btn-outline btn-sm" onclick="showPricing(\'' + media.priceKey + '\')">' +
            '<i class="fas fa-table"></i> 公式料金表を見る</button>' +
            '</div>';
    }

    let rows = '';
    if (s.best) {
        rows += pricingRow('ご予算内で使える最上位プラン', s.best.yen,
            offerText(s.best) + '（この構成から利用可）', 'is-best');
    } else if (s.ceiling !== null) {
        rows += '<div class="pricing-row"><span class="pricing-row-label">ご予算内の選択肢</span>' +
            '<span class="pricing-row-yen">—</span>' +
            '<span class="pricing-row-note">' + yen(s.ceiling) + ' 以内に収まるプランがありません</span></div>';
    }
    rows += pricingRow('このエリアの最安', s.cheapest.yen, offerText(s.cheapest));
    rows += pricingRow('このエリアの最高', s.max.yen,
        offerText(s.max) + (s.hasSubAreas ? '（' + s.max.column + '）' : ''));

    const note = s.hasSubAreas
        ? '※上位プランは駅・市区の指定版（' + s.region.columns[0] + 'など）で料金が変わります'
        : '';

    return '<div class="pricing-box pricing-box-detail">' +
        '<p class="pricing-verified-badge"><i class="fas fa-circle-check"></i> 公式料金表と照合済み</p>' +
        '<p class="pricing-box-area"><i class="fas fa-location-dot"></i> ' +
            s.region.name + '（' + s.region.area + '）</p>' +
        rows +
        (note ? '<p class="pricing-box-foot">' + note + '</p>' : '') +
        '<p class="pricing-box-foot">公式料金表（2026年1月13日ご掲載開始分〜・税別）より算出</p>' +
        '<button class="btn btn-outline btn-sm" ' +
            'onclick="showPricing(\'' + media.priceKey + '\', \'' + s.region.key + '\')">' +
        '<i class="fas fa-table"></i> ' + s.region.name + 'の料金表を見る</button>' +
        '</div>';
}

function pricingRow(label, value, note, extraClass) {
    return '<div class="pricing-row ' + (extraClass || '') + '">' +
        '<span class="pricing-row-label">' + label + '</span>' +
        '<span class="pricing-row-yen">' + yen(value) + '</span>' +
        '<span class="pricing-row-note">' + note + '</span>' +
        '</div>';
}

// ========================================
// 公式料金表ページ
// ========================================
let currentPriceMedia = 'baitoru';
let currentPriceRegion = 'shutoken';

function showPricing(priceKey, regionKey) {
    if (priceKey) {
        currentPriceMedia = priceKey;
    }
    if (regionKey) {
        currentPriceRegion = regionKey;
    } else if (diagnosisData.area) {
        currentPriceRegion = diagnosisData.area;
    }
    renderPricing();
    showPage('pricingPage');
}

function selectPriceMedia(priceKey) {
    currentPriceMedia = priceKey;
    renderPricing();
}

function selectPriceRegion(regionKey) {
    currentPriceRegion = regionKey;
    renderPricing();
}

function renderPricing() {
    const host = document.getElementById('pricingBody');
    if (!host) {
        return;
    }
    document.querySelectorAll('.price-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.dataset.media === currentPriceMedia);
    });
    const regionRow = document.getElementById('priceRegionRow');

    // マイナビバイトはエリア区分が異なるため専用の描画にする
    if (currentPriceMedia === 'mynavi') {
        if (regionRow) {
            regionRow.style.display = 'none';
        }
        host.innerHTML = hasMynaviPricing() ? mynaviTablesHtml()
            : '<p class="pricing-empty">料金データ（js/pricing-mynavi.js）を読み込めませんでした。</p>';
        return;
    }
    if (regionRow) {
        regionRow.style.display = '';
    }
    if (!hasDipPricing()) {
        host.innerHTML = '<p class="pricing-empty">料金データ（js/pricing-data.js）を読み込めませんでした。</p>';
        return;
    }
    const media = dipPricing[currentPriceMedia];
    let region = null;
    media.regions.forEach(function (r) {
        if (r.key === currentPriceRegion) {
            region = r;
        }
    });
    if (!region) {
        region = media.regions[0];
        currentPriceRegion = region.key;
    }

    // エリアセレクト
    const select = document.getElementById('priceRegion');
    select.innerHTML = media.regions.map(function (r) {
        return '<option value="' + r.key + '"' +
            (r.key === region.key ? ' selected' : '') + '>' + r.name + '</option>';
    }).join('');

    host.innerHTML =
        '<p class="price-area-note"><i class="fas fa-location-dot"></i> 該当エリア：' + region.area + '</p>' +
        topTableHtml(media, region) +
        lowTableHtml(media, region);
}

// 上段表（PLプラン／Pプラン(EX)／Pプラン）
function topTableHtml(media, region) {
    const periods = media.topPeriods;
    let head1 = '<tr><th rowspan="2" class="sticky-col">プラン</th><th rowspan="2">枠数</th>';
    region.columns.forEach(function (col) {
        head1 += '<th colspan="' + periods.length + '">' + col + '</th>';
    });
    head1 += '</tr>';

    let head2 = '<tr>';
    region.columns.forEach(function () {
        periods.forEach(function (p) {
            head2 += '<th>' + p + '</th>';
        });
    });
    head2 += '</tr>';

    let body = '';
    media.topPlans.forEach(function (plan) {
        const slots = region.top[plan];
        if (!slots) {
            return;
        }
        media.topSlots.forEach(function (slot, si) {
            body += '<tr>';
            if (si === 0) {
                body += '<th class="sticky-col plan-cell" rowspan="' + media.topSlots.length + '">' + plan + '</th>';
            }
            body += '<th class="slot-cell">' + slot + '</th>';
            (slots[slot] || []).forEach(function (col) {
                col.forEach(function (value) {
                    body += '<td>' + (value === null || value === undefined ? '—' : yen(value)) + '</td>';
                });
            });
            body += '</tr>';
        });
    });

    return '<h3 class="price-table-title"><i class="fas fa-arrow-up-wide-short"></i> 上位プラン（露出度：高）</h3>' +
        '<div class="table-scroll"><table class="price-table">' +
        '<thead>' + head1 + head2 + '</thead><tbody>' + body + '</tbody></table></div>';
}

// 下段表（Aプラン〜Dプラン）
function lowTableHtml(media, region) {
    let head1 = '<tr><th rowspan="2" class="sticky-col">プラン</th><th rowspan="2">枠数</th>';
    media.lowPeriods.forEach(function (p) {
        head1 += '<th colspan="2">' + p + '</th>';
    });
    head1 += '</tr>';

    let head2 = '<tr>';
    media.lowPeriods.forEach(function () {
        head2 += '<th>総額</th><th>7日／1枠</th>';
    });
    head2 += '</tr>';

    let body = '';
    media.lowPlans.forEach(function (plan) {
        const slots = region.low[plan];
        if (!slots) {
            return;
        }
        const slotKeys = media.lowSlots.filter(function (s) {
            return Object.prototype.hasOwnProperty.call(slots, s);
        });
        slotKeys.forEach(function (slot, si) {
            body += '<tr>';
            if (si === 0) {
                body += '<th class="sticky-col plan-cell" rowspan="' + slotKeys.length + '">' + plan + '</th>';
            }
            body += '<th class="slot-cell">' + slot + '</th>';
            slots[slot].forEach(function (total, pi) {
                if (total === null || total === undefined) {
                    body += '<td class="cell-empty">—</td><td class="cell-empty">—</td>';
                    return;
                }
                body += '<td>' + yen(total) + '</td>' +
                    '<td class="cell-unit">' + yen(unitPrice(total, slot, media.lowWeeks[pi])) + '</td>';
            });
            body += '</tr>';
        });
    });

    return '<h3 class="price-table-title"><i class="fas fa-arrow-down-wide-short"></i> Dプラン〜Aプラン（露出度：中〜低）</h3>' +
        '<div class="table-scroll"><table class="price-table">' +
        '<thead>' + head1 + head2 + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<p class="price-unit-note">※「7日／1枠」は 総額 ÷ 枠数 ÷ 週数 で算出した単価です（公式料金表の記載値と一致）。</p>';
}

// ---------- マイナビバイトの料金表 ----------
function mynaviCell(v) {
    return v === null || v === undefined ? '—' : yen(v);
}

function mynaviTable(title, cols, rows) {
    let head = '<tr><th class="sticky-col">商品名</th><th>勤務地数</th><th>掲載期間</th>';
    cols.forEach(function (c) {
        head += '<th>' + c + '</th>';
    });
    head += '</tr>';
    const body = rows.map(function (r) {
        let tr = '<tr><th class="sticky-col plan-cell">' + r.product + '</th>' +
            '<td class="cell-unit">' + (r.sites ? r.sites : '—') + '</td>' +
            '<th class="slot-cell">' + (r.period || '—') + '</th>';
        r.values.forEach(function (v) {
            tr += '<td>' + mynaviCell(v) + '</td>';
        });
        return tr + '</tr>';
    }).join('');
    return '<h3 class="price-table-title"><i class="fas fa-yen-sign"></i> ' + title + '</h3>' +
        '<div class="table-scroll"><table class="price-table"><thead>' + head +
        '</thead><tbody>' + body + '</tbody></table></div>';
}

function mynaviRowsOf(list, areas) {
    return list.map(function (r) {
        return {
            product: r.product,
            sites: r.sites,
            period: r.period,
            values: r.area4 ? r.area4 : areas.map(function () {
                return r.flat === undefined ? null : r.flat;
            })
        };
    });
}

function mynaviSectionHtml(sectionKey) {
    const m = mynaviPricing;
    const sec = m[sectionKey];
    let html = '<h2 class="price-section-title">' + sec.label + '</h2>';

    const basic4 = sec.basic.filter(function (r) {
        return r.area4 || r.flat;
    });
    html += mynaviTable('基本プラン', m.areas, mynaviRowsOf(basic4, m.areas));

    const basic7 = sec.basic.filter(function (r) {
        return r.area7;
    }).map(function (r) {
        return { product: r.product, sites: r.sites, period: r.period, values: r.area7 };
    });
    if (basic7.length) {
        html += mynaviTable('基本プラン／ADスタンダードプラス（7エリア区分）', m.spAreas, basic7);
    }

    if (sec.entry && sec.entry.length) {
        html += '<h3 class="price-table-title"><i class="fas fa-user-check"></i> 応募課金型</h3>' +
            '<div class="table-scroll"><table class="price-table"><thead><tr>' +
            '<th class="sticky-col">商品名</th><th>勤務地数</th><th>掲載期間</th>' +
            '<th>1応募あたり</th><th>備考</th></tr></thead><tbody>' +
            sec.entry.map(function (e) {
                return '<tr><th class="sticky-col plan-cell">' + e.product + '</th>' +
                    '<td class="cell-unit">' + e.sites + '</td>' +
                    '<th class="slot-cell">' + e.period + '</th>' +
                    '<td>' + yen(e.perApply) + '</td>' +
                    '<td class="cell-note">' + e.note + '</td></tr>';
            }).join('') + '</tbody></table></div>';
    }

    html += mynaviTable('フリープラン（全国共通価格）', ['全国共通価格'],
        sec.free.map(function (r) {
            return {
                product: r.product, sites: r.sites, period: r.period,
                values: [r.flat === undefined ? null : r.flat]
            };
        }));
    html += mynaviTable('回数券（10回分）', m.areas, mynaviRowsOf(sec.coupon, m.areas));
    html += mynaviTable('年間プラン', m.areas, mynaviRowsOf(sec.yearly, m.areas));
    return html;
}

function mynaviTablesHtml() {
    const m = mynaviPricing;
    let html = '<p class="price-area-note"><i class="fas fa-map"></i> エリア区分：' +
        m.areas.map(function (a) {
            return a + '（' + m.areaDef[a] + '）';
        }).join(' ／ ') + '</p>';
    html += '<p class="price-area-note"><i class="fas fa-arrow-down-wide-short"></i> 露出度の高い順：' +
        m.productOrder.join(' ＞ ') + '</p>';
    html += mynaviSectionHtml('parttime');
    html += mynaviSectionHtml('fulltime');

    html += '<h2 class="price-section-title">オプション</h2>' +
        '<div class="table-scroll"><table class="price-table"><thead><tr>' +
        '<th class="sticky-col">オプション名</th><th>正社員プラン</th><th>掲載期間</th>' +
        m.areas.map(function (a) {
            return '<th>' + a + '</th>';
        }).join('') + '</tr></thead><tbody>' +
        m.options.map(function (o) {
            const vals = o.area4 ? o.area4 : m.areas.map(function () {
                return o.flat;
            });
            return '<tr><th class="sticky-col plan-cell">' + o.no + '. ' + o.name + '</th>' +
                '<td class="cell-unit">' + (o.fulltimeOk ? '●' : '—') + '</td>' +
                '<th class="slot-cell">' + o.period + '</th>' +
                vals.map(function (v) {
                    return '<td>' + mynaviCell(v) + '</td>';
                }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';

    html += '<p class="price-unit-note">※ ' + m.point.name + '：' + m.point.price +
        '（' + m.point.note + '）</p>';
    html += '<p class="price-unit-note">※ ' + m.note + '</p>';
    html += '<p class="price-unit-note">出典：' + m.source + '</p>';
    return html;
}

function renderPricingNotes() {
    const host = document.getElementById('pricingNotes');
    if (!host || typeof dipPricingNotes === 'undefined') {
        return;
    }
    host.innerHTML = dipPricingNotes.map(function (note) {
        return '<li>' + note + '</li>';
    }).join('');
}

// ========================================
// ページ切り替え
// ========================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function (page) {
        page.classList.remove('active');
    });
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// 診断開始 / 再開
// ========================================
function startDiagnosis() {
    currentQuestion = 1;
    showQuestion(currentQuestion);
    showPage('diagnosisPage');
}

function restartDiagnosis() {
    // 全チェックボックスを解除
    document.querySelectorAll('.question-block input').forEach(function (input) {
        input.checked = false;
    });
    // エラーメッセージを非表示に
    document.querySelectorAll('.error-message').forEach(function (msg) {
        msg.classList.remove('show');
    });

    diagnosisData = {};
    currentQuestion = 1;
    showQuestion(currentQuestion);
    showPage('diagnosisPage');
}

// ========================================
// 質問表示 / プログレス更新
// ========================================
function showQuestion(num) {
    document.querySelectorAll('.question-block').forEach(function (block) {
        block.classList.toggle('active', Number(block.dataset.question) === num);
    });

    // ナビゲーションボタンの状態
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    prevBtn.style.visibility = num === 1 ? 'hidden' : 'visible';
    nextBtn.style.display = num === TOTAL_QUESTIONS ? 'none' : 'inline-flex';
    submitBtn.style.display = num === TOTAL_QUESTIONS ? 'inline-flex' : 'none';

    updateProgress();
}

function updateProgress() {
    const percent = Math.round((currentQuestion / TOTAL_QUESTIONS) * 100);
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressPercent').textContent = percent + '%';
    document.getElementById('currentQuestionNum').textContent = currentQuestion;
}

// ========================================
// 質問の前後移動
// ========================================
function nextQuestion() {
    if (!validateCurrentQuestion()) {
        return;
    }
    if (currentQuestion < TOTAL_QUESTIONS) {
        currentQuestion++;
        showQuestion(currentQuestion);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousQuestion() {
    if (currentQuestion > 1) {
        currentQuestion--;
        showQuestion(currentQuestion);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========================================
// バリデーション
// ========================================
function validateCurrentQuestion() {
    const block = document.querySelector('.question-block[data-question="' + currentQuestion + '"]');
    // Q1のエリアはラジオ、Q2以降はチェックボックス
    const checked = block.querySelectorAll('input:checked');
    const error = document.getElementById('error' + currentQuestion);

    if (checked.length === 0) {
        error.classList.add('show');
        return false;
    }
    error.classList.remove('show');
    return true;
}

// ========================================
// 回答データ収集
// ========================================
function collectDiagnosisData() {
    const data = {};
    Object.keys(WEIGHTS).forEach(function (key) {
        const selected = document.querySelectorAll('input[name="' + key + '"]:checked');
        data[key] = Array.prototype.map.call(selected, function (input) {
            return input.value;
        });
    });
    // エリアは単一選択（採点には使わず、掲載料金の算出に使う）
    const area = document.querySelector('input[name="area"]:checked');
    data.area = area ? area.value : null;
    return data;
}

// ========================================
// スコア計算（100点満点）
// ========================================
function calculateMediaScores(data) {
    const results = [];

    Object.keys(mediaDatabase).forEach(function (id) {
        const media = mediaDatabase[id];
        let total = 0;
        const breakdown = {};
        const matchedTags = [];

        Object.keys(WEIGHTS).forEach(function (key) {
            const selected = data[key] || [];
            const mediaValues = media[MEDIA_FIELD_MAP[key]] || [];

            const matched = selected.filter(function (value) {
                return mediaValues.indexOf(value) !== -1;
            });

            // 選択項目のうち、この媒体がカバーしている割合 × 配点
            const ratio = selected.length > 0 ? matched.length / selected.length : 0;
            const score = Math.round(WEIGHTS[key] * ratio);

            breakdown[key] = score;
            total += score;

            matched.forEach(function (value) {
                matchedTags.push(LABELS[key][value]);
            });
        });

        results.push({
            id: id,
            media: media,
            score: Math.min(total, 100),
            breakdown: breakdown,
            matchedTags: matchedTags
        });
    });

    // スコア降順（同点は媒体名で安定化）
    results.sort(function (a, b) {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.media.name.localeCompare(b.media.name, 'ja');
    });

    return results;
}

// ========================================
// 結果表示
// ========================================
function displayResults(data, results) {
    // 診断条件サマリー（先頭に募集エリア）
    const summary = document.getElementById('resultSummary');
    let html = '<dl class="summary-item summary-item-area">' +
        '<dt>募集エリア</dt>' +
        '<dd>' + (data.area && LABELS.area[data.area] ? LABELS.area[data.area] : '—') + '</dd>' +
        '</dl>';
    html += Object.keys(SUMMARY_TITLES).map(function (key) {
        const values = (data[key] || []).map(function (value) {
            return LABELS[key][value];
        });
        return '<dl class="summary-item">' +
            '<dt>' + SUMMARY_TITLES[key] + '</dt>' +
            '<dd>' + (values.join('／') || '—') + '</dd>' +
            '</dl>';
    }).join('');
    summary.innerHTML = html;

    const lead = document.getElementById('resultLead');
    if (lead) {
        lead.innerHTML = data.area && LABELS.area[data.area]
            ? 'ご回答内容をもとに7媒体を100点満点で採点し、掲載料金は<strong>' +
              LABELS.area[data.area] + '</strong>の公式料金で算出しました。'
            : 'ご回答内容をもとに、7媒体を100点満点で採点しました。';
    }

    // ランキング
    const list = document.getElementById('rankingList');
    list.innerHTML = results.map(function (item, index) {
        const rank = index + 1;
        const media = item.media;

        const features = media.features.map(function (text) {
            return '<li>' + text + '</li>';
        }).join('');

        const tags = item.matchedTags.length > 0
            ? item.matchedTags.map(function (text) {
                return '<span class="tag tag-match">' + text + '</span>';
            }).join('')
            : '<span class="tag">合致条件なし</span>';

        return '' +
            '<article class="rank-card rank-' + rank + '" style="animation-delay: ' + (index * 0.08) + 's;">' +
                '<div class="rank-head">' +
                    '<span class="rank-badge">' + rank + '</span>' +
                    '<div class="rank-name-area">' +
                        '<h3 class="rank-name">' + media.name + '</h3>' +
                        '<p class="rank-catch">' + media.catch + '</p>' +
                    '</div>' +
                    '<div class="rank-score">' +
                        '<span class="rank-score-value">' + item.score + '</span>' +
                        '<span class="rank-score-unit">点</span>' +
                        '<span class="rank-score-label">マッチ度 / 100点</span>' +
                    '</div>' +
                '</div>' +
                '<div class="score-bar"><div class="score-bar-fill" data-score="' + item.score + '"></div></div>' +
                '<div class="rank-body">' +
                    '<div class="rank-section">' +
                        '<h4><i class="fas fa-star"></i> 媒体の特徴</h4>' +
                        '<ul class="feature-list">' + features + '</ul>' +
                    '</div>' +
                    '<div class="rank-section">' +
                        '<h4><i class="fas fa-yen-sign"></i> 費用の目安</h4>' +
                        pricingBoxHtml(media, data) +
                        '<h4 style="margin-top:16px;"><i class="fas fa-circle-check"></i> 合致した条件</h4>' +
                        '<div class="tag-list">' + tags + '</div>' +
                    '</div>' +
                '</div>' +
            '</article>';
    }).join('');

    // スコアバーをアニメーションさせる
    requestAnimationFrame(function () {
        document.querySelectorAll('.score-bar-fill').forEach(function (bar) {
            bar.style.width = bar.dataset.score + '%';
        });
    });
}

// ========================================
// 診断送信
// ========================================
function submitDiagnosis() {
    if (!validateCurrentQuestion()) {
        return;
    }

    diagnosisData = collectDiagnosisData();
    const results = calculateMediaScores(diagnosisData);
    displayResults(diagnosisData, results);
    showPage('resultPage');
}

// ========================================
// PDF保存（印刷ダイアログ経由）
// ========================================
function downloadPDF() {
    window.print();
}

// ========================================
// お問い合わせモーダル
// ========================================
function showContact() {
    document.getElementById('contactModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeContact() {
    document.getElementById('contactModal').classList.remove('show');
    document.body.style.overflow = '';
}

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    // チェック時にエラーメッセージを消す
    document.querySelectorAll('.question-block input').forEach(function (input) {
        input.addEventListener('change', function () {
            const block = input.closest('.question-block');
            const error = document.getElementById('error' + block.dataset.question);
            if (error) {
                error.classList.remove('show');
            }
        });
    });

    // モーダルの外側クリックで閉じる
    document.getElementById('contactModal').addEventListener('click', function (event) {
        if (event.target === this) {
            closeContact();
        }
    });

    // Escキーでモーダルを閉じる
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeContact();
        }
    });

    // 初期状態のリセット（ブラウザのフォーム復元対策）
    document.querySelectorAll('.question-block input').forEach(function (input) {
        input.checked = false;
    });
    document.querySelectorAll('.error-message').forEach(function (msg) {
        msg.classList.remove('show');
    });

    // 公式料金データを持つ媒体の予算帯を実データから同期
    syncDipBudgetRanges();

    // Q1のエリア選択肢を生成
    renderAreaOptions();

    // 料金表ページの初期化
    renderPricingNotes();
    const regionSelect = document.getElementById('priceRegion');
    if (regionSelect) {
        regionSelect.addEventListener('change', function () {
            selectPriceRegion(this.value);
        });
    }

    showQuestion(1);
});
