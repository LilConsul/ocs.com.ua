from translator.config import is_branding, load_config


def test_branding_detects_wipotec_footer_but_not_product_names():
    cfg = load_config()
    assert is_branding("WIPOTEC-OCS GMBH | ALL RIGHTS RESERVED", cfg)
    assert is_branding("www.wipotec-ocs.com", cfg)
    assert is_branding("DE        EN        ES        FR        IT", cfg)
    assert not is_branding("WIPOTEC EMFR Weigh Cell", cfg)


def test_never_translate_loaded():
    cfg = load_config()
    assert "EtherNet/IP" in cfg.never_translate
