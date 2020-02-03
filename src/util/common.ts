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

export const getFirstName = (name: any) => {
    return name.split(' ')[0];
};

export const uid = () => {
    const id = () => {
        return (Math.random()).toString(36).substring(2);
    };
    return `_${id()}-${id()}`;
};
