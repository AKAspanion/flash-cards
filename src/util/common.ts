import router from '../router';

export const navigateToPath = (path: any) => {
    router.push({
        path,
    }).catch(() => { /**/ });
};

export const getInitials = (name: any) => {
    const initials = name.match(/\b\w/g) || [];
    return ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
};
