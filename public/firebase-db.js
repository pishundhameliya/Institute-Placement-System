window.CACHE = {
  currentUser: null,
  userData: null,
  jobs: [],
  applications: [],
  notifications: [],
  users: []
};

let unsubscribers = [];

let renderTimeout = null;
const queueRender = () => {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    if (typeof render === 'function') render();
  }, 100);
};

// Save/update user profile in Firestore
async function saveUserProfile(userId, data) {
  try {
    await db.collection('users').doc(userId).set(data, { merge: true });
    const idx = CACHE.users.findIndex(u => u.id === userId);
    if (idx >= 0) CACHE.users[idx] = { ...CACHE.users[idx], ...data, id: userId };
    else CACHE.users.push({ ...data, id: userId });
    if (CACHE.currentUser && CACHE.currentUser.uid === userId) {
      CACHE.userData = { ...CACHE.userData, ...data, id: userId };
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    toast('Error', 'Failed to save profile. Please try again.', 'danger');
  }
}

async function postJobToFirestore(jobData) {
  try {
    const docRef = await db.collection('jobs').add({
      ...jobData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    jobData.id = docRef.id;
    jobData.createdAt = Date.now();
    CACHE.jobs.unshift(jobData);
    return docRef.id;
  } catch (err) {
    console.error('Error posting job:', err);
    toast('Error', 'Failed to post job. Please try again.', 'danger');
    return null;
  }
}

async function applyForJobFirestore(appData) {
  try {
    const docRef = await db.collection('applications').add({
      ...appData,
      appliedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    appData.id = docRef.id;
    appData.appliedAt = Date.now();
    CACHE.applications.unshift(appData);
    return docRef.id;
  } catch (err) {
    console.error('Error applying:', err);
    toast('Error', 'Failed to submit application. Please try again.', 'danger');
    return null;
  }
}

async function updateApplicationFirestore(appId, updateData) {
  try {
    await db.collection('applications').doc(appId).update({
      ...updateData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const idx = CACHE.applications.findIndex(a => a.id === appId);
    if (idx >= 0) CACHE.applications[idx] = { ...CACHE.applications[idx], ...updateData };
  } catch (err) {
    console.error('Error updating application:', err);
    toast('Error', 'Failed to update application.', 'danger');
  }
}

async function deleteApplicationFirestore(appId) {
  try {
    await db.collection('applications').doc(appId).delete();
    CACHE.applications = CACHE.applications.filter(a => a.id !== appId);
  } catch (err) {
    console.error('Error deleting application:', err);
    toast('Error', 'Failed to withdraw application.', 'danger');
  }
}

async function pushNotification(userId, { title, message, link = '#/dashboard', type = 'info' }) {
  try {
    const notifData = {
      userId,
      title,
      message,
      link,
      type,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('notifications').add(notifData);
    notifData.id = docRef.id;
    notifData.createdAt = Date.now();
    if (userId === CACHE.currentUser?.uid) {
      CACHE.notifications.unshift(notifData);
    }
    const user = getUser(userId);
    if (user && user.email) {
      console.log(`📧 Email notification to ${user.email}: ${title} - ${message}`);
    }
    const phone = user?.profile?.phone || user?.company?.phone || user?.faculty?.phone;
    if (phone) {
      console.log(`📱 SMS notification to ${phone}: ${title} - ${message}`);
    }
  } catch (err) {
    console.error('Error pushing notification:', err);
  }
}

async function markNotificationRead(notifId) {
  try {
    await db.collection('notifications').doc(notifId).update({ read: true });
    const n = CACHE.notifications.find(x => x.id === notifId);
    if (n) n.read = true;
  } catch (err) {
    console.error('Error marking notification:', err);
  }
}

// REALTIME LISTENERS
function setupRealtimeListeners(userId) {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  const role = CACHE.userData?.role;

  const unsubUsers = db.collection('users').onSnapshot(snapshot => {
    CACHE.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (CACHE.currentUser) {
      CACHE.userData = CACHE.users.find(u => u.id === CACHE.currentUser.uid) || CACHE.userData;
    }
  }, err => console.error('Users listener error:', err));
  unsubscribers.push(unsubUsers);

  const unsubJobs = db.collection('jobs').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    CACHE.jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
      };
    });
    queueRender();
  }, err => console.error('Jobs listener error:', err));
  unsubscribers.push(unsubJobs);

  let appQuery = db.collection('applications');
  if (role === 'student') {
    appQuery = appQuery.where('studentId', '==', userId);
  }

  const unsubApps = appQuery.onSnapshot(snapshot => {
    CACHE.applications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        appliedAt: data.appliedAt?.toMillis ? data.appliedAt.toMillis() : data.appliedAt || Date.now()
      };
    });
    queueRender();
  }, err => console.error('Applications listener error:', err));
  unsubscribers.push(unsubApps);

  const unsubNotifs = db.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot(snapshot => {
      const prevCount = CACHE.notifications.filter(n => n.userId === userId && !n.read).length;
      CACHE.notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
        };
      });
      const newCount = CACHE.notifications.filter(n => !n.read).length;
      if (newCount > prevCount) {
        const latest = CACHE.notifications.find(n => !n.read);
        if (latest) toast(latest.title, latest.message, latest.type === 'success' ? 'success' : 'info');
      }
      render();
    }, err => console.error('Notifications listener error:', err));
  unsubscribers.push(unsubNotifs);
}

function setupPublicRealtimeListeners() {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  const unsubJobs = db.collection('jobs').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    CACHE.jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
      };
    });
    queueRender();
  }, err => console.error('Public jobs listener error:', err));
  unsubscribers.push(unsubJobs);
}

async function loadPublicData() {
  try {
    const jobsSnap = await db.collection('jobs').orderBy('createdAt', 'desc').get();
    CACHE.jobs = jobsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now()
      };
    });
    CACHE.users = [];
    CACHE.applications = [];
    if (auth.currentUser) {
      const appsSnap = await db.collection('applications').get();
      CACHE.applications = appsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toMillis ? data.appliedAt.toMillis() : data.appliedAt || Date.now()
        };
      });
    }
  } catch (err) {
    console.error('Error loading public data:', err);
    toast('Connection Issue', 'Could not load Firestore data. Please check your internet and Firebase rules.', 'warn');
  }
}

async function verifyFirestoreConnection() {
  try {
    await db.collection('jobs').limit(1).get();
    console.log('Firestore connection verified.');
  } catch (err) {
    console.error('Firestore connectivity check failed:', err);
    toast('Firestore Error', 'Firebase connected but Firestore query failed. Check rules/indexes.', 'danger');
  }
}

async function loginWithEmail(email, password) {
  try {
    showLoading('Signing in...');
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    hideLoading();
    let msg = 'Login failed. Please try again.';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email. Please sign up first.';
    else if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
    else if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password. Please check and try again.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please wait and try again later.';
    toast('Login Failed', msg, 'danger');
  }
}

async function signupWithEmail(email, password, userData) {
  try {
    showLoading('Creating account...');
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const userId = cred.user.uid;
    await db.collection('users').doc(userId).set({
      ...userData,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('notifications').add({
      userId,
      title: 'Welcome to IPS!',
      message: 'Your account has been created successfully. Complete your profile to get started.',
      link: userData.role === 'employer' ? '#/employer/post' : '#/profile',
      type: 'info',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    hideLoading();
    let msg = 'Registration failed. Please try again.';
    if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Try logging in instead.';
    else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters long.';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
    toast('Registration Failed', msg, 'danger');
  }
}

async function logoutUser() {
  try {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    await auth.signOut();
    CACHE.currentUser = null;
    CACHE.userData = null;
    CACHE.notifications = [];
    location.hash = '#/home';
    render();
    toast('Logged Out', 'You have been logged out successfully.', 'info');
  } catch (err) {
    console.error('Logout error:', err);
    toast('Error', 'Failed to log out.', 'danger');
  }
}

async function deleteDocsByQuery(queryFactory, pageSize = 200) {
  let totalDeleted = 0;
  while (true) {
    const snap = await queryFactory().limit(pageSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.size;
    if (snap.size < pageSize) break;
  }
  return totalDeleted;
}

async function removeCurrentAccount() {
  const authUser = auth.currentUser;
  const userId = authUser?.uid;
  const user = currentUser();
  if (!authUser || !userId || !user) {
    toast('Account Error', 'Please login again and retry account removal.', 'danger');
    return;
  }
  const shouldDelete = confirm('Do you want to delete your account?');
  if (!shouldDelete) {
    toast('Cancelled', 'Account deletion cancelled.', 'info');
    return;
  }
  try {
    showLoading('Removing account data...');
    await deleteDocsByQuery(() => db.collection('applications').where('studentId', '==', userId));
    const myJobsSnap = await db.collection('jobs').where('employerId', '==', userId).get();
    for (const jobDoc of myJobsSnap.docs) {
      await deleteDocsByQuery(() => db.collection('applications').where('jobId', '==', jobDoc.id));
    }
    if (!myJobsSnap.empty) {
      const batchJobs = db.batch();
      myJobsSnap.docs.forEach(d => batchJobs.delete(d.ref));
      await batchJobs.commit();
    }
    await deleteDocsByQuery(() => db.collection('notifications').where('userId', '==', userId));
    await db.collection('users').doc(userId).delete();
    await authUser.delete();
    CACHE.currentUser = null;
    CACHE.userData = null;
    CACHE.jobs = [];
    CACHE.applications = [];
    CACHE.notifications = [];
    CACHE.users = [];
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    hideLoading();
    location.hash = '#/home';
    toast('Account Removed', 'Your account has been deleted permanently.', 'success');
    render();
  } catch (err) {
    hideLoading();
    console.error('Account deletion error:', err);
    if (err?.code === 'auth/requires-recent-login') {
      toast('Re-login Required', 'For security, please logout/login again and then delete your account.', 'warn');
      return;
    }
    toast('Delete Failed', 'Could not remove account. Please try again.', 'danger');
  }
}
