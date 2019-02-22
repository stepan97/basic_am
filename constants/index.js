const mimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml"
];

const availableLanguages = [
    "hy",
    "ru",
    "en"
];

// TODO: change email address
const basicEmailAddress = "address@mail.ru";

module.exports = {
    DEFAULT_COURSE_ICON_URL: "/static/images/courses/images/default_course_icon.png",
    DEFAULT_COURSE_IMAGE_URL: "/static/images/courses/images/default_course_image.png",
    DEFAULT_INSTRUCTOR_IMAGE_URL: "/static/images/instructors/default_instructor_image.png",
    allowedMimeTypes: mimeTypes,
    availableLanguages: availableLanguages,
    basicEmailAddress: basicEmailAddress
};