import FirebaseWeb from '../firebase';
const firebase = new FirebaseWeb();


export const loadData = (user: any) => {
    return Promise.all([
        fetchAllFlashCardSets(user),
        fetchAllLabels(user),
    ]);
};

export const fetchAllFlashCardSets = (user: any) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllFlashCardSetsByUID(user)
            .then((snapshot: any) => {
                return parseAllFlashCardSets(snapshot);
            })
            .then((sets) => {
                resolve(sets);
            })
            .catch((err) => {
                reject('Error getting flash cards. Please try later!');
            });
    });
};

const parseAllFlashCardSets = (snapshot: any) => {
    const sets: any = [];
    return new Promise((resolve) => {
        snapshot.forEach((doc: any) => {
            const data: any = doc.data();
            sets.push({
                ...data,
                docId: doc.id,
                cards: JSON.parse(data.cards),
            });
        });
        resolve(sets);
    });
};

export const fetchAllLabels = (user: any) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllLabelsByUID(user)
            .then((snapshot: any) => {
                return parseAllLabels(snapshot);
            })
            .then((labels) => {
                resolve(labels);
            })
            .catch((err) => {
                reject('Error getting labels. Please try later!');
            });
    });
};

const parseAllLabels = (snapshot: any) => {
    const labels: any = [];
    return new Promise((resolve) => {
        snapshot.forEach((doc: any) => {
            const data: any = doc.data();
            labels.push({
                ...data,
                docId: doc.id,
            });
        });
        resolve(labels);
    });
};
