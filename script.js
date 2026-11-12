
/* =========================================
   AMOUR ET PASSION ❤️
   Réseau social Firebase
========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    push,
    get,
    update,
    remove,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* FIREBASE */

const firebaseConfig = {
    apiKey: "AIzaSyDYqBTPnzeK59bcVjCSHLz_PEh-E0idx4",
    authDomain: "amour-et-passion.firebaseapp.com",
    databaseURL: "https://amour-et-passion-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "amour-et-passion",
    storageBucket: "amour-et-passion.firebasestorage.app",
    messagingSenderId: "748582080667",
    appId: "1:748582080667:web:ed1c06e44348bc24d6363e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/* CLOUDINARY */

const CLOUDINARY_NAME = "or0nel6j";
const CLOUDINARY_PRESET = "amour et passion";

let utilisateur = null;
let profilActuel = null;

/* OUTILS */

function element(id) {
    return document.getElementById(id);
}

function afficherMessage(id, message) {
    if (element(id)) element(id).textContent = message;
}

function securiserTexte(texte) {
    return String(texte ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

async function televerserFichier(fichier) {
    if (!fichier) return "";

    const donnees = new FormData();
    donnees.append("file", fichier);
    donnees.append("upload_preset", CLOUDINARY_PRESET);

    const reponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/auto/upload`,
        { method: "POST", body: donnees }
    );

    const resultat = await reponse.json();

    if (!reponse.ok) {
        throw new Error(resultat.error?.message || "Erreur d'envoi du fichier");
    }

    return resultat.secure_url;
}

/* INSCRIPTION */

element("formInscription")?.addEventListener("submit", async e => {
    e.preventDefault();

    const email = element("emailInscription").value.trim();
    const motDePasse = element("motDePasseInscription").value;

    try {
        await createUserWithEmailAndPassword(auth, email, motDePasse);
        afficherMessage("messageConnexion", "Compte créé avec succès ❤️");
    } catch (erreur) {
        afficherMessage("messageConnexion", erreur.message);
    }
});

/* CONNEXION */

element("formConnexion")?.addEventListener("submit", async e => {
    e.preventDefault();

    try {
        await signInWithEmailAndPassword(
            auth,
            element("emailConnexion").value.trim(),
            element("motDePasseConnexion").value
        );
    } catch (erreur) {
        afficherMessage("messageConnexion", "Connexion impossible : " + erreur.message);
    }
});

/* DECONNEXION */

async function deconnexion() {
    await signOut(auth);
}

window.deconnexion = deconnexion;

/* AUTHENTIFICATION */

onAuthStateChanged(auth, async user => {
    utilisateur = user;

    if (element("connexion")) {
        element("connexion").style.display = user ? "none" : "flex";
    }

    if (element("application")) {
        element("application").style.display = user ? "block" : "none";
    }

    if (!user) {
        profilActuel = null;
        return;
    }

    console.log("Utilisateur connecté. UID :", user.uid);

    try {
        await chargerProfil();
    } catch (erreur) {
        console.error("Erreur pendant le chargement du profil :", erreur);

        if (element("zoneMonProfil")) {
            element("zoneMonProfil").textContent =
                "Impossible de charger le profil : " + (erreur.message || erreur);
        }

        afficherMessage(
            "messageProfil",
            "Erreur de chargement du profil : " + erreur.message
        );
    }

    try {
        ecouterPublications();
    } catch (erreur) {
        console.error("Publications :", erreur);
    }

    try {
        ecouterStories();
    } catch (erreur) {
        console.error("Stories :", erreur);
    }

    try {
        chargerAmis();
    } catch (erreur) {
        console.error("Amis :", erreur);
    }

    try {
        chargerNotifications();
    } catch (erreur) {
        console.error("Notifications :", erreur);
    }
});

/* NAVIGATION */

function afficherSection(nom) {
    document.querySelectorAll(".page-section").forEach(section => {
        section.style.display = "none";
    });

    const cible = element(nom);

    if (cible) cible.style.display = "block";
}

window.afficherSection = afficherSection;

/* PROFIL */

async function chargerProfil() {
    if (!utilisateur) {
        throw new Error("Aucun utilisateur connecté.");
    }

    const cheminProfil = "membres/" + utilisateur.uid;

    console.log("Chargement du profil depuis :", cheminProfil);

    const resultat = await get(ref(db, cheminProfil));

    if (resultat.exists()) {
        profilActuel = resultat.val() || {};
    } else {
        profilActuel = {
            uid: utilisateur.uid,
            email: utilisateur.email || "",
            prenom: (utilisateur.email || "Membre").split("@")[0],
            age: "",
            ville: "",
            orientation: "",
            recherche: "",
            description: "",
            photo: "",
            prive: false
        };
    }

    profilActuel.uid = profilActuel.uid || utilisateur.uid;
    profilActuel.email = profilActuel.email || utilisateur.email || "";

    profilActuel.prenom =
        profilActuel.prenom ||
        (utilisateur.email || "Membre").split("@")[0];

    afficherProfil();
    remplirFormulaireProfil();
}

function remplirFormulaireProfil() {
    if (!profilActuel) return;

    const champs = {
        prenomProfil: profilActuel.prenom,
        ageProfil: profilActuel.age,
        villeProfil: profilActuel.ville,
        orientationProfil: profilActuel.orientation,
        rechercheProfil: profilActuel.recherche,
        descriptionProfil: profilActuel.description
    };

    Object.entries(champs).forEach(([id, valeur]) => {
        const champ = element(id);

        if (champ && valeur !== undefined && valeur !== null) {
            champ.value = valeur;
        }
    });

    const prive = element("profilPrive");

    if (prive) {
        prive.checked = Boolean(profilActuel.prive);
    }
}

function afficherProfil() {
    const zone = element("zoneMonProfil");

    if (!zone || !profilActuel) return;

    const nom =
        profilActuel.prenom ||
        (utilisateur?.email || "Membre").split("@")[0];

    zone.innerHTML = `
        <h3>${securiserTexte(nom)}</h3>
        <p>${securiserTexte(profilActuel.ville || "Ville non renseignée")}</p>
        <p>${securiserTexte(profilActuel.description || "Aucune description pour le moment.")}</p>

        ${
            profilActuel.photo
                ? `<img src="${securiserTexte(profilActuel.photo)}" width="150" alt="Photo de profil">`
                : "<p>Aucune photo de profil.</p>"
        }
    `;
}

element("formProfil")?.addEventListener("submit", async e => {
    e.preventDefault();

    if (!utilisateur) return;

    const age = Number(element("ageProfil").value);

    if (age < 18) {
        afficherMessage("messageProfil", "Tu dois avoir au moins 18 ans.");
        return;
    }

    try {
        const fichier = element("photoProfil").files[0];

        const photo = fichier
            ? await televerserFichier(fichier)
            : profilActuel.photo || "";

        profilActuel = {
            uid: utilisateur.uid,
            email: utilisateur.email,
            prenom: element("prenomProfil").value.trim(),
            age,
            ville: element("villeProfil").value.trim(),
            orientation: element("orientationProfil").value,
            recherche: element("rechercheProfil").value.trim(),
            description: element("descriptionProfil").value.trim(),
            prive: element("profilPrive").checked,
            photo
        };

        await set(
            ref(db, "membres/" + utilisateur.uid),
            profilActuel
        );

        afficherProfil();

        afficherMessage("messageProfil", "Profil enregistré ❤️");

    } catch (erreur) {
        afficherMessage("messageProfil", erreur.message);
        console.error("Enregistrement du profil :", erreur);
    }
});

/* PUBLICATIONS */

element("formPublication")?.addEventListener("submit", async e => {
    e.preventDefault();

    if (!utilisateur) return;

    const texte = element("publication").value.trim();
    const fichier = element("photoPublication").files[0];

    if (!texte && !fichier) return;

    try {
        const media = fichier
            ? await televerserFichier(fichier)
            : "";

        const nouvellePublication = push(ref(db, "publications"));

        await set(nouvellePublication, {
            auteurId: utilisateur.uid,
            auteur: profilActuel?.prenom || utilisateur.email,
            photoProfil: profilActuel?.photo || "",
            texte,
            media,
            date: Date.now(),
            likes: 0
        });

        element("formPublication").reset();

    } catch (erreur) {
        alert("Publication impossible : " + erreur.message);
    }
});

/* FIL D'ACTUALITE */

function ecouterPublications() {
    onValue(
        ref(db, "publications"),

        snapshot => {
            const zone = element("filActualite");

            if (!zone) return;

            zone.innerHTML = "<h3>Fil d'actualité</h3>";

            const publications = [];

            snapshot.forEach(enfant => {
                publications.push({
                    id: enfant.key,
                    ...enfant.val()
                });
            });

            publications.sort(
                (a, b) => (b.date || 0) - (a.date || 0)
            );

            publications.forEach(post => {
                const carte = document.createElement("article");

                carte.className = "content-card";
                carte.id = "publication-" + post.id;

                const media = post.media
                    ? `<img src="${securiserTexte(post.media)}" class="post-media" alt="Publication">`
                    : "";

                carte.innerHTML = `
                    <h3>${securiserTexte(post.auteur)}</h3>
                    <p>${securiserTexte(post.texte)}</p>

                    ${media}

                    <div class="post-actions">
                        <button class="like-button" data-id="${post.id}">
                            ❤️ J'aime
                        </button>

                        <button class="comment-button" data-id="${post.id}">
                            💬 Commenter
                        </button>

                        <button class="share-button" data-id="${post.id}">
                            ↗ Partager
                        </button>
                    </div>

                    <div id="compteur-${post.id}">
                        Chargement des J'aime...
                    </div>

                    <div id="commentaires-${post.id}"></div>

                    <form class="comment-form" data-id="${post.id}">
                        <input
                            type="text"
                            name="commentaire"
                            placeholder="Écrire un commentaire..."
                            required
                        >

                        <button type="submit">Envoyer</button>
                    </form>
                `;

                zone.appendChild(carte);

                ecouterLikes(post.id);
            });
        },

        erreur => {
            console.error("Erreur de lecture des publications :", erreur);
        }
    );
}

/* J'AIME */

async function aimerPublication(id) {
    if (!utilisateur) return;

    const likeRef = ref(
        db,
        `publicationLikes/${id}/${utilisateur.uid}`
    );

    try {
        const resultat = await get(likeRef);

        if (resultat.exists()) {
            await remove(likeRef);
        } else {
            await set(likeRef, true);
        }

    } catch (erreur) {
        alert("Impossible de modifier le J'aime : " + erreur.message);
    }
}

function ecouterLikes(id) {
    onValue(
        ref(db, "publicationLikes/" + id),

        snapshot => {
            const compteur = snapshot.exists()
                ? Object.keys(snapshot.val()).length
                : 0;

            const zone = element("compteur-" + id);

            if (zone) {
                zone.textContent = `❤️ ${compteur} J'aime`;
            }
        },

        erreur => {
            console.error("Erreur de lecture des J'aime :", erreur);
        }
    );
}

window.aimerPublication = aimerPublication;

/* COMMENTAIRES */

async function envoyerCommentaire(id, texte) {
    if (!utilisateur || !texte.trim()) return;

    const nouveau = push(
        ref(db, "publicationCommentaires/" + id)
    );

    await set(nouveau, {
        auteurId: utilisateur.uid,
        auteur: profilActuel?.prenom || utilisateur.email,
        texte: texte.trim(),
        date: Date.now()
    });
}

function afficherCommentaires(id) {
    const zone = element("commentaires-" + id);

    if (!zone) return;

    onValue(
        ref(db, "publicationCommentaires/" + id),

        snapshot => {
            zone.innerHTML = "";

            snapshot.forEach(enfant => {
                const commentaire = enfant.val();

                const ligne = document.createElement("p");

                ligne.textContent =
                    (commentaire.auteur || "Membre") +
                    " : " +
                    commentaire.texte;

                zone.appendChild(ligne);
            });
        },

        erreur => {
            console.error("Erreur de lecture des commentaires :", erreur);
        }
    );
}

window.afficherCommentaires = afficherCommentaires;

document.addEventListener("click", e => {
    const like = e.target.closest(".like-button");
    const comment = e.target.closest(".comment-button");
    const share = e.target.closest(".share-button");

    if (like) {
        aimerPublication(like.dataset.id);
    }

    if (comment) {
        afficherCommentaires(comment.dataset.id);
    }

    if (share) {
        partagerPublication(share.dataset.id);
    }
});

document.addEventListener("submit", e => {
    if (!e.target.matches(".comment-form")) return;

    e.preventDefault();

    const id = e.target.dataset.id;
    const texte = e.target.elements.commentaire.value;

    envoyerCommentaire(id, texte)
        .catch(erreur => {
            alert("Commentaire impossible : " + erreur.message);
        });

    e.target.reset();
});

/* PARTAGE */

async function partagerPublication(id) {
    const url =
        location.href.split("#")[0] +
        "#publication-" +
        id;

    try {
        if (navigator.share) {
            await navigator.share({
                title: "Amour et Passion",
                text: "Découvre cette publication ❤️",
                url
            });
        } else {
            await navigator.clipboard.writeText(url);
            alert("Lien copié !");
        }

    } catch (erreur) {
        if (erreur.name !== "AbortError") {
            alert("Partage indisponible.");
        }
    }
}

window.partagerPublication = partagerPublication;

/* STORIES */

element("formStory")?.addEventListener("submit", async e => {
    e.preventDefault();

    if (!utilisateur) return;

    const fichier = element("photoStory").files[0];
    const texte = element("texteStory").value.trim();

    if (!fichier && !texte) return;

    try {
        const media = fichier
            ? await televerserFichier(fichier)
            : "";

        const story = push(ref(db, "stories"));

        await set(story, {
            auteurId: utilisateur.uid,
            auteur: profilActuel?.prenom || utilisateur.email,
            texte,
            media,
            date: Date.now()
        });

        e.target.reset();

    } catch (erreur) {
        alert("Story impossible : " + erreur.message);
    }
});

function ecouterStories() {
    onValue(
        ref(db, "stories"),

        snapshot => {
            const zone = element("stories");

            if (!zone) return;

            zone.innerHTML = "";

            snapshot.forEach(enfant => {
                const story = enfant.val();

                const carte = document.createElement("button");

                carte.className = "story-tile";
                carte.textContent = story.auteur || "Story";

                carte.addEventListener("click", () => {
                    ouvrirStory(story);
                });

                zone.appendChild(carte);
            });
        },

        erreur => {
            console.error("Erreur de lecture des stories :", erreur);
        }
    );
}

function ouvrirStory(story) {
    if (!element("visionneuseStory")) return;

    element("visionneuseStory").style.display = "flex";

    element("contenuStory").innerHTML = `
        <h3>${securiserTexte(story.auteur)}</h3>
        <p>${securiserTexte(story.texte)}</p>

        ${
            story.media
                ? `<img src="${securiserTexte(story.media)}" style="max-width:90%;max-height:70vh" alt="Story">`
                : ""
        }
    `;
}

function fermerStory() {
    if (element("visionneuseStory")) {
        element("visionneuseStory").style.display = "none";
    }
}

window.ouvrirStory = ouvrirStory;
window.fermerStory = fermerStory;

/* AMIS */

async function chargerAmis() {
    const zone = element("listeAmis");

    if (!zone) return;

    onValue(
        ref(db, "amis/" + utilisateur.uid),

        async snapshot => {
            zone.innerHTML = "";

            if (!snapshot.exists()) {
                zone.textContent = "Aucun ami pour le moment.";
                return;
            }

            for (const uid of Object.keys(snapshot.val())) {
                try {
                    const resultat = await get(
                        ref(db, "membres/" + uid)
                    );

                    if (resultat.exists()) {
                        const membre = resultat.val();

                        const ligne = document.createElement("p");

                        ligne.textContent = membre.prenom || "Membre";

                        zone.appendChild(ligne);
                    }

                } catch (erreur) {
                    console.error("Erreur de chargement d'un ami :", erreur);
                }
            }
        },

        erreur => {
            console.error("Erreur de lecture des amis :", erreur);
        }
    );
}

/* NOTIFICATIONS */

function chargerNotifications() {
    const zone = element("listeNotifications");

    if (!zone) return;

    onValue(
        ref(db, "notifications/" + utilisateur.uid),

        snapshot => {
            zone.innerHTML = "";

            snapshot.forEach(enfant => {
                const notification = enfant.val();

                const ligne = document.createElement("p");

                ligne.textContent =
                    notification.texte || "Nouvelle notification ❤️";

                zone.appendChild(ligne);
            });
        },

        erreur => {
            console.error("Erreur de lecture des notifications :", erreur);
        }
    );
}

/* RECHERCHE MEMBRES */

element("rechercheMembres")?.addEventListener("input", async e => {
    if (!utilisateur) return;

    const recherche = e.target.value.toLowerCase();

    const zone = element("suggestionsAmis");

    if (!zone) return;

    try {
        const resultat = await get(ref(db, "membres"));

        zone.innerHTML = "";

        if (!resultat.exists()) return;

        resultat.forEach(enfant => {
            const membre = enfant.val();

            if (
                enfant.key !== utilisateur.uid &&
                !membre.prive &&
                (membre.prenom || "").toLowerCase().includes(recherche)
            ) {
                const ligne = document.createElement("p");

                ligne.textContent = membre.prenom || "Membre";

                zone.appendChild(ligne);
            }
        });

    } catch (erreur) {
        console.error("Erreur de recherche des membres :", erreur);
    }
});

/* BLOCAGE ET SIGNALEMENT */

async function bloquerMembre(uid) {
    if (!utilisateur || !uid) return;

    try {
        await set(
            ref(db, `blocages/${utilisateur.uid}/${uid}`),
            true
        );

        alert("Membre bloqué.");

    } catch (erreur) {
        alert("Blocage impossible : " + erreur.message);
    }
}

async function signalerMembre(uid, raison = "Signalement") {
    if (!utilisateur || !uid) return;

    try {
        const signalement = push(ref(db, "signalements"));

        await set(signalement, {
            auteurId: utilisateur.uid,
            membreSignale: uid,
            raison,
            date: Date.now()
        });

        alert("Signalement envoyé.");

    } catch (erreur) {
        alert("Signalement impossible : " + erreur.message);
    }
}

window.bloquerMembre = bloquerMembre;
window.signalerMembre = signalerMembre;

/* FIN */

console.log("Amour et Passion ❤️ est prêt !");
