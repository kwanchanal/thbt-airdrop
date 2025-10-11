document.addEventListener("DOMContentLoaded", function () {

    // ====== CONFIG (edit safely) ======
    const CONFIG = {
        // Activity window (ICT). You can override for testing via URL: ?start=2025-07-01&end=2025-10-30
        startDate: new Date('2025-07-01T00:00:00+07:00'),
        endDate: new Date('2025-10-30T23:59:59+07:00'),
        rewardDate: new Date('2025-11-01T00:00:00+07:00'),

        // Dune API (read-only)
        // duneApiKey: process.env.DUNE_API_KEY,
        duneApiKey: 'HvPnsBKDN6OtNlbxPMlhXpnRX1oN7itx',
        duneResultUrl: 'https://api.dune.com',
        duneOnlyEligibleQuery: 5914964, // pre‑filtered eligible list query
        duneAllUsersQuery: 5944833, // all users query

        // Contracts
        thbtBase: '0xdC200537D99d8b4f0C89D59A68e29b67057d2c5F',
        digipetBsc721: '0xbdede6f507931638daca8db8c61422aff7566190'
    };

    // URL param overrides for testing dates
    const usp = new URLSearchParams(location.search);
    if (usp.get('start')) CONFIG.startDate = new Date(usp.get('start') + 'T00:00:00+07:00');
    if (usp.get('end')) CONFIG.endDate = new Date(usp.get('end') + 'T23:59:59+07:00');

    // ====== UTIL ======
    const qs = (s, el = document) => el.querySelector(s);
    const fmt = n => n.toLocaleString('en-US');
    const short = a => a ? a.slice(0, 6) + '…' + a.slice(-4) : '';

    function humanCountdown(target) {
        const now = new Date();
        let s = Math.max(0, Math.floor((target - now) / 1000));
        const d = Math.floor(s / 86400); s %= 86400;
        const h = Math.floor(s / 3600); s %= 3600;
        const m = Math.floor(s / 60); s %= 60;
        return `${d}d ${h}h ${m}m ${s}s`;
    }

    function tickCountdown() {
        const now = new Date();
        let phaseLabel = 'Starts In';
        let target = CONFIG.startDate;
        if (now >= CONFIG.startDate && now <= CONFIG.endDate) {
            phaseLabel = 'Ends In';
            target = CONFIG.endDate;
        } else if (now > CONFIG.endDate) {
            phaseLabel = 'Ended';
        }
        document.getElementById('phaseLabel').textContent = phaseLabel;
        document.getElementById('countdown').textContent = (phaseLabel === 'Ended') ? '—' : humanCountdown(target);
    }
    setInterval(tickCountdown, 1000);
    tickCountdown();

    // Render static quest catalog (descriptions)
    const QUESTS = [
        { id: 'mint100', icon: '', label: 'Mint THBT ≥ 250 THBT', desc: 'THB → THBT total at least 250 THBT within activity window.' },
        { id: 'p2p1', icon: '', label: 'Transfer THBT to a friend ≥ 1 tx', desc: 'Peer‑to‑peer transfer, any amount.' },
        { id: 'swap_out10', icon: '', label: 'Swap THBT → USDT ≥ 50 THBT', desc: 'Cumulative swap volume out of THBT to USDT ≥ 50.' },
        { id: 'swap_in10', icon: '', label: 'Swap USDT → THBT ≥ 50 THBT', desc: 'Cumulative swap volume into THBT from USDT ≥ 50.' },
    ];

    function renderQuestCatalog() {
        const cont = qs('#questCatalog');
        cont.innerHTML = '';
        for (const q of QUESTS) {
            const el = document.createElement('div');
            el.className = 'task';
            el.innerHTML = `
        <div class="ico">${q.icon ? q.icon : '🔒'}</div>
        <div>
          <div class="label">${q.label}</div>
          <div class="small">${q.desc}</div>
        </div>`;
            cont.appendChild(el);
        }
    }
    renderQuestCatalog();

        // Render static quest catalog (descriptions)
    const DIGIPET_QUESTS = [
        { id: 'hasDigipet', icon: '🐶', label: 'Hold Digipet NFT', desc: 'Special for Digipet NFT holder' }
    ];

    function renderDigipetQuestCatalog() {
        const cont = qs('#digipetQuestCatalog');
        cont.innerHTML = '';
        for (const q of DIGIPET_QUESTS) {
            const el = document.createElement('div');
            el.className = 'task';
            el.innerHTML = `
        <div class="ico">${q.icon ? q.icon : '⭐️'}</div>
        <div>
          <div class="label">${q.label}</div>
          <div class="small">${q.desc}</div>
        </div>`;
            cont.appendChild(el);
        }
    }
    renderDigipetQuestCatalog();

            // Render static quest catalog (descriptions)
    const EXTRA_QUESTS = [
        { id: 'storefront1', icon: '🎫', label: 'Purchase coupon ≥ 1 tx', desc: 'At least one storefront purchase.' }
    ];

    function renderExtraQuestCatalog() {
        const cont = qs('#extraQuestCatalog');
        cont.innerHTML = '';
        for (const q of EXTRA_QUESTS) {
            const el = document.createElement('div');
            el.className = 'task';
            el.innerHTML = `
        <div class="ico">${q.icon ? q.icon : '⭐️'}</div>
        <div>
          <div class="label">${q.label}</div>
          <div class="small">${q.desc}</div>
        </div>`;
            cont.appendChild(el);
        }
    }
    renderExtraQuestCatalog();

    // ====== Dune fetch & Eligible list ======

    async function loadEligibleUsers() {
        const rows = await fetchDune(CONFIG.duneOnlyEligibleQuery);
        hydrateStats(rows);
    }

    let ELIGIBLE_USERS = [];
    async function loadAllUsers() {
        const rows = await fetchDune(CONFIG.duneAllUsersQuery);
        ELIGIBLE_USERS = rows;
        return rows;
    }

    async function fetchDune(queryId) {
        const res = await fetch(`${CONFIG.duneResultUrl}/api/v1/query/${queryId}/results`, { headers: { 'X-Dune-API-Key': CONFIG.duneApiKey } });
        if (!res.ok) throw new Error('Dune HTTP ' + res.status);
        const js = await res.json();
        const rows = (js && js.result && js.result.rows) ? js.result.rows : [];

        return rows;
    }

    function truthy(v) {
        if (v === undefined || v === null) return false;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v > 0;
        if (typeof v === 'string') return v.trim() !== '' && v !== '0' && v.toLowerCase() !== 'false';
        return !!v;
    }


    function hydrateStats(rows) {
        // Build Eligible list directly from Dune rows (no scoring)
        const eligRows = rows;

        document.getElementById('statEligible').textContent = fmt(eligRows.length);

        const ul = document.getElementById('leader');
        const items = eligRows.map((r, i) => {
            const addr = r['Wallet'].toLowerCase();
            if (!addr) return '';
            return `<li><span><span class="mono">${short(addr)}</span></span><span class="small digipet-holder">${r['Digipet NFT (pcs)'] ? 'Digipet Holder' : '✔'}</span></li>`;
        }).filter(Boolean).join('');
        ul.innerHTML = items || '<li><span class="small">No eligible wallets yet</span><span></span></li>';
    }

    // ====== Address check flow (uses authoritative Dune row) ======
    document.getElementById('btnCheck').addEventListener('click', onCheck);
    document.getElementById('btnClear').addEventListener('click', onClear);
    document.getElementById('addr').addEventListener('keydown', (e) => { if (e.key === 'Enter') onCheck(); });

    function onClear() {
        const res = document.getElementById('checkResult');
        document.getElementById('addr').value = '';
        document.getElementById('outAddr').textContent = '—';
        document.getElementById('eligState').textContent = '—';
        document.getElementById('eligState').style.color = '';
        document.getElementById('eligNote').textContent = '';
        document.getElementById('digipetBadge').style.display = 'none';
        const list = document.getElementById('questList');
        if (list) list.innerHTML = '';
        if (res) res.style.display = 'none';
    }


    const REWARDS = [
        { id: 'basic', icon: '🎉', label: 'Basic Airdrop', desc: 'Proportional share of 100,000 USDT worth of THBT tokens' },
        { id: 'shopper', icon: '🎉', label: 'Basic Airdrop', desc: 'Proportional share of 100,000 USDT worth of THBT tokens' },
        { id: 'digipet', icon: '🎉', label: 'Basic Airdrop', desc: 'Proportional share of 100,000 USDT worth of THBT tokens' },
    ];


    async function onCheck() {
        const addr = (document.getElementById('addr').value || '').trim().toLowerCase();
        if (!/^0x[a-f0-9]{40}$/i.test(addr)) {
            alert('Please paste a valid wallet address.');
            return;
        }
        document.getElementById('outAddr').textContent = addr;
        document.getElementById('checkResult').style.display = '';

        let row = ELIGIBLE_USERS.find(r => {
            const cand = r['Wallet'].toLowerCase();
            return cand === addr;
        });

        if (!row) {
            try { await loadAllUsers(); } catch (e) { console.warn(e); }
            row = ELIGIBLE_USERS.find(r => {
                const cand = r['Wallet'].toLowerCase();
                return cand === addr;
            });
        }

        let prog = { mint100: false, p2p1: false, swap_out10: false, swap_in10: false, storefront1: false };
        if (row) {
            console.log('Found row', row);
            prog = {
                mint100: truthy(row['Mint Amount (THBT)']) && Number(row['Mint Amount (THBT)']) >= 100,
                p2p1: truthy(row['P2P (Tx)']) && Number(row['P2P (Tx)']) >= 1,
                swap_out10: truthy(row['To Pool (THBT)']) && Number(row['To Pool (THBT)']) >= 10,
                swap_in10: truthy(row['From Pool (THBT)']) && Number(row['From Pool (THBT)']) >= 10,
                storefront1: truthy(row['To Storefront (Tx)']) && Number(row['To Storefront (Tx)']) >= 1,
                hasDigipet: truthy(row['Digipet NFT (pcs)']) && Number(row['Digipet NFT (pcs)']) >= 1
            };
            
        }

        renderEligibility(prog);
    }

    function renderEligibility(prog) {
        const el = document.getElementById('eligState');
        const note = document.getElementById('eligNote');
        const badge = document.getElementById('digipetBadge');

        const eligible = prog.mint100 && prog.p2p1 && prog.swap_out10 && prog.swap_in10;
        let reward = 0;
        if (eligible) reward += 1000; // base
        if (prog.storefront1) reward += 500; // extra shopper
        if (prog.hasDigipet) reward += 1000; // extra digipet

        el.style.color = eligible ? 'var(--ok)' : 'var(--err)';
        el.textContent = `${reward.toLocaleString()} THBT`;
        note.textContent = eligible ? 'You have completed all required quests within the activity window.' : 'Complete the remaining quests during the activity window to recieve rewards';
        badge.style.display = prog.hasDigipet ? 'inline-block' : 'none';

        const list = document.getElementById('questList');
        list.innerHTML = '';
        const mk = (ok, label, desc) => {
            const div = document.createElement('div');
            div.className = 'task';
            div.innerHTML = `<div class="ico">${ok ? '✅' : '⛔️'}</div><div><div class="label">${label}</div><div class="small">${desc}</div></div>`;
            return div;
        };
        QUESTS.concat(EXTRA_QUESTS).
        concat(DIGIPET_QUESTS).
        forEach(d => list.appendChild(mk(!!prog[d.id], d.label, d.desc)));
    }


    // Kickoff: load Dune rows for stats/eligible list right away + manual refresh
    loadEligibleUsers().catch(err => {
        console.error(err);
        document.getElementById('statEligible').textContent = '—';
        document.getElementById('leader').innerHTML = '<li><span>Unable to fetch Dune data</span><span class="small">try later</span></li>';
    });
    const btnR = document.getElementById('refreshDune');
    if (btnR) btnR.addEventListener('click', () => {
        btnR.disabled = true; const old = btnR.textContent; btnR.textContent = 'Loading…';
        loadEligibleUsers().finally(() => { btnR.disabled = false; btnR.textContent = old; });
    });

});