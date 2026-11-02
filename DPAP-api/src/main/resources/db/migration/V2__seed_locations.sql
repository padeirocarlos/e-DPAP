-- Maputo Province administrative hierarchy (codes match the frontend).
INSERT INTO district (code, name) VALUES
    ('BOA', 'Boane'),
    ('MAG', 'Magude'),
    ('MAN', 'Manhiça'),
    ('MAR', 'Marracuene'),
    ('MAT', 'Matutuíne'),
    ('MOA', 'Moamba'),
    ('NAM', 'Namaacha');

INSERT INTO administrative_post (code, district_code, name) VALUES
    ('BOA-SED', 'BOA', 'Boane-Sede'),
    ('BOA-MAT', 'BOA', 'Matola-Rio'),
    ('MAG-SED', 'MAG', 'Magude-Sede'),
    ('MAG-MAP', 'MAG', 'Mapulanguene'),
    ('MAN-SED', 'MAN', 'Manhiça-Sede'),
    ('MAN-XIN', 'MAN', 'Xinavane'),
    ('MAR-SED', 'MAR', 'Marracuene-Sede'),
    ('MAR-MAC', 'MAR', 'Machubo'),
    ('MAT-SED', 'MAT', 'Bela Vista'),
    ('MAT-ZIT', 'MAT', 'Zitundo'),
    ('MOA-SED', 'MOA', 'Moamba-Sede'),
    ('MOA-RES', 'MOA', 'Ressano Garcia'),
    ('NAM-SED', 'NAM', 'Namaacha-Sede');
