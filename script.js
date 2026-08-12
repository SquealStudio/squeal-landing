document.addEventListener('DOMContentLoaded', function () {
    var coverPhotos = document.querySelectorAll('.cover-photo');
    coverPhotos.forEach(function (img) {
        img.addEventListener('error', function () {
            img.style.display = 'none';
        });
    });

    var founderAvatar = document.querySelector('.avatar.filled img');
    if (founderAvatar) {
        founderAvatar.addEventListener('error', function () {
            var avatar = founderAvatar.parentElement;
            founderAvatar.remove();
            avatar.textContent = 'K';
        });
    }
});
