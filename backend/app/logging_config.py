import logging
import sys

def setup_logging():
    logger = logging.getLogger("rocksense")
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    
    logger.addHandler(stdout_handler)
    
    # Root logger config as well to catch uvicorn/fastapi logs
    logging.basicConfig(level=logging.INFO, handlers=[stdout_handler])
    
    return logger

logger = setup_logging()
